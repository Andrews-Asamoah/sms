// app/api/schools/[schoolSlug]/classes/[classId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const updateClassSchema = z.object({
  name: z
    .string()
    .min(2, "Class name must be at least 2 characters")
    .max(50, "Class name must not exceed 50 characters")
    .trim()
    .optional(),
  level: z
    .string()
    .min(1, "Level is required")
    .max(20, "Level must not exceed 20 characters")
    .trim()
    .optional(),
  section: z.string().trim().nullable().optional(),
  capacity: z.number().int().positive().max(500).nullable().optional(),
  academicYearId: z.string().min(1).optional(),
  classTeacherId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  schoolId: z.string().min(1, "School ID is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
});

// ============================================================================
// PATCH - Update Class
// ============================================================================

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ schoolSlug: string; classId: string }> },
) {
  try {
    const params = await context.params;
    const { schoolSlug, classId } = params;

    console.log(`[CLASS_UPDATE] Updating class ${classId} for ${schoolSlug}`);

    // Step 1: Verify session and school access
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Step 2: Check authorization
    const canManage =
      session.isSuperAdmin ||
      role?.effectiveRole === "owner" ||
      role?.effectiveRole === "admin";

    if (!canManage) {
      console.warn(`[CLASS_UPDATE] Access denied for user ${session.user.id}`);
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Step 3: Parse and validate request body
    const body = await request.json();
    console.log(`[CLASS_UPDATE] Validating request data`);
    const validatedData = updateClassSchema.parse(body);

    // Step 4: Verify school exists and belongs to organization
    const school = await prisma.school.findUnique({
      where: {
        subdomain: schoolSlug,
        id: validatedData.schoolId,
        organizationId: validatedData.organizationId,
      },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    });

    if (!school) {
      console.error(`[CLASS_UPDATE] School not found: ${schoolSlug}`);
      return NextResponse.json(
        { error: "School not found or you don't have access" },
        { status: 404 },
      );
    }

    // Step 5: Verify user is a member of the organization
    if (!session.isSuperAdmin && school.organization.members.length === 0) {
      console.warn(
        `[CLASS_UPDATE] User ${session.user.id} is not a member of organization ${school.organizationId}`,
      );
      return NextResponse.json(
        { error: "You are not a member of this school's organization" },
        { status: 403 },
      );
    }

    // Step 6: Verify class exists and belongs to school
    const existingClass = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: school.id,
      },
    });

    if (!existingClass) {
      console.error(
        `[CLASS_UPDATE] Class ${classId} not found for school ${school.id}`,
      );
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Step 7: Verify academic year belongs to school if provided
    if (validatedData.academicYearId) {
      const academicYear = await prisma.academicYear.findFirst({
        where: {
          id: validatedData.academicYearId,
          schoolId: school.id,
        },
      });

      if (!academicYear) {
        console.error(
          `[CLASS_UPDATE] Academic year ${validatedData.academicYearId} not found`,
        );
        return NextResponse.json(
          { error: "Academic year not found" },
          { status: 404 },
        );
      }
    }

    // Step 8: Verify teacher belongs to school if provided
    if (validatedData.classTeacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          id: validatedData.classTeacherId,
          schoolId: school.id,
          isActive: true,
        },
      });

      if (!teacher) {
        console.error(
          `[CLASS_UPDATE] Teacher ${validatedData.classTeacherId} not found or inactive`,
        );
        return NextResponse.json(
          { error: "Teacher not found or inactive" },
          { status: 404 },
        );
      }
    }

    // Step 9: Check for duplicate class name if name is being changed
    if (validatedData.name && validatedData.name !== existingClass.name) {
      const duplicateClass = await prisma.class.findFirst({
        where: {
          name: validatedData.name,
          academicYearId:
            validatedData.academicYearId || existingClass.academicYearId,
          schoolId: school.id,
          id: { not: classId },
        },
      });

      if (duplicateClass) {
        console.warn(
          `[CLASS_UPDATE] Duplicate class name: ${validatedData.name}`,
        );
        return NextResponse.json(
          {
            error:
              "A class with this name already exists in this academic year",
          },
          { status: 409 },
        );
      }
    }

    console.log(`[CLASS_UPDATE] Updating class with validated data`);

    // Step 10: Update class
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.level && { level: validatedData.level }),
        ...(validatedData.section !== undefined && {
          section: validatedData.section,
        }),
        ...(validatedData.capacity !== undefined && {
          capacity: validatedData.capacity,
        }),
        ...(validatedData.academicYearId && {
          academicYearId: validatedData.academicYearId,
        }),
        ...(validatedData.classTeacherId !== undefined && {
          classTeacherId: validatedData.classTeacherId,
        }),
        ...(validatedData.isActive !== undefined && {
          isActive: validatedData.isActive,
        }),
      },
      include: {
        academicYear: true,
        classTeacher: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Step 11: Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Class",
        entityId: updatedClass.id,
        oldValues: {
          name: existingClass.name,
          level: existingClass.level,
          section: existingClass.section,
          capacity: existingClass.capacity,
          isActive: existingClass.isActive,
        },
        newValues: {
          name: updatedClass.name,
          level: updatedClass.level,
          section: updatedClass.section,
          capacity: updatedClass.capacity,
          isActive: updatedClass.isActive,
        },
      },
    });

    console.log(`[CLASS_UPDATE] Successfully updated class ${classId}`);

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error("[CLASS_UPDATE] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Delete Class
// ============================================================================

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ schoolSlug: string; classId: string }> },
) {
  try {
    const params = await context.params;
    const { schoolSlug, classId } = params;

    console.log(
      `[CLASS_DELETE] Attempting to delete class ${classId} for ${schoolSlug}`,
    );

    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Check authorization
    const canManage =
      session.isSuperAdmin ||
      role?.effectiveRole === "owner" ||
      role?.effectiveRole === "admin";

    if (!canManage) {
      console.warn(`[CLASS_DELETE] Access denied for user ${session.user.id}`);
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      console.error(`[CLASS_DELETE] School not found: ${schoolSlug}`);
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Verify class exists and belongs to school
    const existingClass = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: school.id,
      },
      include: {
        _count: {
          select: {
            students: true,
            enrollments: true,
            subjects: true,
          },
        },
      },
    });

    if (!existingClass) {
      console.error(
        `[CLASS_DELETE] Class ${classId} not found for school ${school.id}`,
      );
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check for dependencies
    const dependencies: string[] = [];
    if (existingClass._count.students > 0) {
      dependencies.push(`${existingClass._count.students} student(s)`);
    }
    if (existingClass._count.enrollments > 0) {
      dependencies.push(`${existingClass._count.enrollments} enrollment(s)`);
    }
    if (existingClass._count.subjects > 0) {
      dependencies.push(`${existingClass._count.subjects} subject(s)`);
    }

    if (dependencies.length > 0) {
      console.warn(
        `[CLASS_DELETE] Class ${classId} has dependencies: ${dependencies.join(", ")}`,
      );
      return NextResponse.json(
        {
          error: `Cannot delete class with existing dependencies: ${dependencies.join(
            ", ",
          )}. Please remove all associations first.`,
        },
        { status: 400 },
      );
    }

    console.log(`[CLASS_DELETE] Deleting class ${classId}`);

    // Delete class
    await prisma.class.delete({
      where: { id: classId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "Class",
        entityId: classId,
        oldValues: {
          name: existingClass.name,
          level: existingClass.level,
          section: existingClass.section,
          schoolId: existingClass.schoolId,
        },
      },
    });

    console.log(`[CLASS_DELETE] Successfully deleted class ${classId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CLASS_DELETE] Error:", error);

    if (error instanceof Error) {
      console.error("[CLASS_DELETE] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
