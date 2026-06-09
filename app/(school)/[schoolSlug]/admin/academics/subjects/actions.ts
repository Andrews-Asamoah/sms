// app/(school)/[schoolSlug]/admin/academic/subjects/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const subjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(10, "Code must be at most 10 characters")
    .regex(/^[A-Z0-9-]+$/, "Code must be uppercase alphanumeric with hyphens"),
  description: z.string().optional(),
  departmentIds: z
    .array(z.string())
    .min(1, "At least one department is required"),
  periodsPerWeek: z.number().int().min(1).max(10),
  isActive: z.boolean().default(true),
});

// ============================================================================
// CREATE SUBJECT
// ============================================================================

export async function createSubject(
  schoolSlug: string,
  data: z.infer<typeof subjectSchema>,
) {
  try {
    // Validate session and authorization
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher"
    ) {
      return {
        success: false,
        error: "You don't have permission to create subjects",
      };
    }

    // Validate input
    const validated = subjectSchema.parse(data);

    // Get school
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return { success: false, error: "School not found" };
    }

    // Check if code already exists in this school
    const existingCode = await prisma.subject.findFirst({
      where: {
        schoolId: school.id,
        code: validated.code,
      },
    });

    if (existingCode) {
      return {
        success: false,
        error: `Subject code "${validated.code}" already exists`,
      };
    }

    // Create subject
    const subject = await prisma.subject.create({
      data: {
        schoolId: school.id,
        name: validated.name,
        code: validated.code,
        description: validated.description || null,
        departments: {
          connect: validated.departmentIds.map((id) => ({ id })),
        },
        periodsPerWeek: validated.periodsPerWeek,
        isActive: validated.isActive,
      },
      include: {
        departments: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "SUBJECT",
        entityId: subject.id,
        newValues: {
          name: subject.name,
          code: subject.code,
          departmentIds: validated.departmentIds,
        },
      },
    });

    revalidatePath(`/${schoolSlug}/admin/academic/subjects`);

    return {
      success: true,
      data: subject,
      message: `Subject "${subject.name}" created successfully`,
    };
  } catch (error) {
    console.error("[CREATE_SUBJECT] Error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create subject",
    };
  }
}

// ============================================================================
// UPDATE SUBJECT
// ============================================================================

export async function updateSubject(
  schoolSlug: string,
  subjectId: string,
  data: z.infer<typeof subjectSchema>,
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher"
    ) {
      return {
        success: false,
        error: "You don't have permission to update subjects",
      };
    }

    const validated = subjectSchema.parse(data);

    // Check if subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { school: true },
    });

    if (!existingSubject) {
      return { success: false, error: "Subject not found" };
    }

    // Check if code is being changed and if new code already exists
    if (validated.code !== existingSubject.code) {
      const codeExists = await prisma.subject.findFirst({
        where: {
          schoolId: existingSubject.schoolId,
          code: validated.code,
          id: { not: subjectId },
        },
      });

      if (codeExists) {
        return {
          success: false,
          error: `Subject code "${validated.code}" already exists`,
        };
      }
    }

    // Update subject
    const subject = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: validated.name,
        code: validated.code,
        description: validated.description || null,
        departments: {
          set: validated.departmentIds.map((id) => ({ id })),
        },
        periodsPerWeek: validated.periodsPerWeek,
        isActive: validated.isActive,
      },
      include: {
        departments: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "SUBJECT",
        entityId: subject.id,
        oldValues: {
          name: existingSubject.name,
          code: existingSubject.code,
        },
        newValues: {
          name: subject.name,
          code: subject.code,
          departmentIds: validated.departmentIds,
        },
      },
    });

    revalidatePath(`/${schoolSlug}/admin/academic/subjects`);
    revalidatePath(`/${schoolSlug}/admin/academic/subjects/${subjectId}`);

    return {
      success: true,
      data: subject,
      message: `Subject "${subject.name}" updated successfully`,
    };
  } catch (error) {
    console.error("[UPDATE_SUBJECT] Error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update subject",
    };
  }
}

// ============================================================================
// DELETE SUBJECT
// ============================================================================

export async function deleteSubject(schoolSlug: string, subjectId: string) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher"
    ) {
      return {
        success: false,
        error: "You don't have permission to delete subjects",
      };
    }

    // Check if subject exists and get relationships
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        _count: {
          select: {
            teachers: true,
            classSubjects: true,
            assessmentScores: true,
          },
        },
      },
    });

    if (!subject) {
      return { success: false, error: "Subject not found" };
    }

    // Check for dependencies
    const hasTeachers = subject._count.teachers > 0;
    const hasClasses = subject._count.classSubjects > 0;
    const hasAssessments = subject._count.assessmentScores > 0;

    if (hasTeachers || hasClasses || hasAssessments) {
      const dependencies = [];
      if (hasTeachers) dependencies.push(`${subject._count.teachers} teachers`);
      if (hasClasses)
        dependencies.push(`${subject._count.classSubjects} classes`);
      if (hasAssessments)
        dependencies.push(
          `${subject._count.assessmentScores} assessment records`,
        );

      return {
        success: false,
        error: "Cannot delete subject with existing data",
        details: `This subject has ${dependencies.join(", ")}. Please remove these dependencies first.`,
      };
    }

    // Delete subject
    await prisma.subject.delete({
      where: { id: subjectId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "SUBJECT",
        entityId: subjectId,
        oldValues: {
          name: subject.name,
          code: subject.code,
        },
      },
    });

    revalidatePath(`/${schoolSlug}/admin/academic/subjects`);

    return {
      success: true,
      message: `Subject "${subject.name}" deleted successfully`,
    };
  } catch (error) {
    console.error("[DELETE_SUBJECT] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete subject",
    };
  }
}

// ============================================================================
// ASSIGN TEACHER TO SUBJECT
// ============================================================================

export async function assignTeacherToSubject(
  schoolSlug: string,
  subjectId: string,
  teacherId: string,
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher"
    ) {
      return {
        success: false,
        error: "You don't have permission to assign teachers",
      };
    }

    // Check if assignment already exists
    const existing = await prisma.subjectTeacher.findFirst({
      where: {
        subjectId,
        teacherId,
      },
    });

    if (existing) {
      return {
        success: false,
        error: "This teacher is already assigned to this subject",
      };
    }

    // Create assignment
    const assignment = await prisma.subjectTeacher.create({
      data: {
        subjectId,
        teacherId,
      },
      include: {
        subject: true,
        teacher: {
          include: {
            profile: true,
          },
        },
      },
    });

    revalidatePath(`/${schoolSlug}/admin/academic/subjects/${subjectId}`);

    return {
      success: true,
      data: assignment,
      message: "Teacher assigned successfully",
    };
  } catch (error) {
    console.error("[ASSIGN_TEACHER] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to assign teacher",
    };
  }
}

// ============================================================================
// REMOVE TEACHER FROM SUBJECT
// ============================================================================

export async function removeTeacherFromSubject(
  schoolSlug: string,
  subjectTeacherId: string,
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher"
    ) {
      return {
        success: false,
        error: "You don't have permission to remove teacher assignments",
      };
    }

    // Get assignment details before deleting
    const assignment = await prisma.subjectTeacher.findUnique({
      where: { id: subjectTeacherId },
      include: {
        subject: true,
        teacher: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!assignment) {
      return { success: false, error: "Assignment not found" };
    }

    // Delete assignment
    await prisma.subjectTeacher.delete({
      where: { id: subjectTeacherId },
    });

    revalidatePath(
      `/${schoolSlug}/admin/academic/subjects/${assignment.subjectId}`,
    );

    return {
      success: true,
      message: "Teacher removed from subject successfully",
    };
  } catch (error) {
    console.error("[REMOVE_TEACHER] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to remove teacher",
    };
  }
}

// ============================================================================
// BULK ASSIGN SUBJECT TO DEPARTMENT
// ============================================================================

export async function bulkAssignSubjectToDepartment(
  schoolSlug: string,
  subjectId: string,
  departmentId: string,
  teacherId?: string,
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher"
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });
    if (!school) return { success: false, error: "School not found" };

    // Find all classes in this department
    const classes = await prisma.class.findMany({
      where: { schoolId: school.id, departmentId },
    });

    if (classes.length === 0) {
      return {
        success: false,
        error:
          "No classes found in this department. Please create classes first.",
      };
    }

    // Upsert ClassSubject for each class
    for (const cls of classes) {
      const createData: any = {
        classId: cls.id,
        subjectId,
      };
      if (teacherId !== undefined) {
        createData.teacherId = teacherId;
      }

      const updateData: any = {};
      if (teacherId !== undefined) {
        updateData.teacherId = teacherId;
      }

      await prisma.classSubject.upsert({
        where: {
          classId_subjectId: {
            classId: cls.id,
            subjectId,
          },
        },
        create: createData,
        update:
          Object.keys(updateData).length > 0 ? updateData : { classId: cls.id }, // Provide a dummy update if no teacher is set
      });
    }

    revalidatePath(`/${schoolSlug}/admin`, "layout");

    return {
      success: true,
      message: `Assigned subject to ${classes.length} class${classes.length > 1 ? "es" : ""} successfully.`,
    };
  } catch (error) {
    console.error("[BULK_ASSIGN_SUBJECT]", error);
    return { success: false, error: "Failed to assign subject to classes" };
  }
}
