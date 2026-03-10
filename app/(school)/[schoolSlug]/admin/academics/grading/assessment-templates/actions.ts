// app/(school)/[schoolSlug]/admin/academics/grading/assessment-templates/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { z } from "zod";
import { AssessmentType } from "@/lib/generated/prisma/client";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const componentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  componentType: z.nativeEnum(AssessmentType),
  maxMarks: z.coerce.number().min(1, "Max marks must be at least 1"),
  weight: z.coerce.number().min(0).max(100, "Weight must be between 0 and 100"),
  displayOrder: z.coerce.number().int().optional(),
  isRequired: z.boolean().default(true),
  isRepeatable: z.boolean().default(false),
  expectedCount: z.coerce.number().int().min(1).default(1),
});

const templateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  gradingSystemId: z.string().min(1, "Grading system is required"),
  classLevel: z.string().nullable().optional(),
  subjectCode: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  deadline: z.string().nullable().optional(),
  isLocked: z.boolean().default(false),
  classIds: z.array(z.string()).default([]),
  components: z
    .array(componentSchema)
    .min(1, "At least one component is required"),
});

// ============================================================================
// CREATE ASSESSMENT TEMPLATE
// ============================================================================

export async function createAssessmentTemplate(
  schoolSlug: string,
  data: z.infer<typeof templateSchema>,
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner"
    ) {
      return {
        success: false,
        error: "You don't have permission to create assessment templates",
      };
    }

    const validated = templateSchema.parse(data);

    // Validate total weight
    const totalWeight = validated.components.reduce(
      (sum, comp) => sum + comp.weight,
      0,
    );

    if (Math.abs(totalWeight - 100) > 0.01) {
      return {
        success: false,
        error: `Total weight must be 100%. Current total: ${totalWeight}%`,
      };
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return { success: false, error: "School not found" };
    }

    // Create template with components and class assignments
    const template = await prisma.assessmentTemplate.create({
      data: {
        schoolId: school.id,
        name: validated.name,
        description: validated.description,
        gradingSystemId: validated.gradingSystemId,
        classLevel: validated.classLevel,
        subjectCode: validated.subjectCode,
        isActive: validated.isActive,
        deadline: validated.deadline ? new Date(validated.deadline) : null,
        isLocked: validated.isLocked,
        components: {
          create: validated.components.map((comp, index) => ({
            name: comp.name,
            componentType: comp.componentType,
            maxMarks: comp.maxMarks,
            weight: comp.weight,
            displayOrder: index + 1,
            isRequired: comp.isRequired,
            isRepeatable: comp.isRepeatable,
            expectedCount: comp.expectedCount,
          })),
        },
        classes: {
          create: validated.classIds.map((classId) => ({
            classId,
          })),
        },
      },
    });

    // Trigger notifications if classes are assigned
    if (validated.classIds.length > 0) {
      const { notifyTeachersOfAssessment } = await import("@/lib/notifications");
      await notifyTeachersOfAssessment(school.id, template.id, template.name);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "OTHER", // Should add ASSESSMENT_TEMPLATE to enum
        entityId: template.id,
        newValues: {
          name: template.name,
          components: validated.components.length,
        },
      },
    });

    revalidatePath(
      `/${schoolSlug}/admin/academics/grading/assessment-templates`,
    );

    return {
      success: true,
      message: "Assessment template created successfully",
    };
  } catch (error) {
    console.error("[CREATE_ASSESSMENT_TEMPLATE] Error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create template",
    };
  }
}

// ============================================================================
// UPDATE ASSESSMENT TEMPLATE
// ============================================================================

export async function updateAssessmentTemplate(
  schoolSlug: string,
  templateId: string,
  data: z.infer<typeof templateSchema>,
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner"
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const validated = templateSchema.parse(data);

    // Validate total weight
    const totalWeight = validated.components.reduce(
      (sum, comp) => sum + comp.weight,
      0,
    );

    if (Math.abs(totalWeight - 100) > 0.01) {
      return {
        success: false,
        error: `Total weight must be 100%. Current total: ${totalWeight}%`,
      };
    }

    // Transaction to update template and replace components
    await prisma.$transaction(async (tx) => {
      // 1. Update template basic info and classes
      await tx.assessmentTemplate.update({
        where: { id: templateId },
        data: {
          name: validated.name,
          description: validated.description,
          gradingSystemId: validated.gradingSystemId,
          classLevel: validated.classLevel,
          subjectCode: validated.subjectCode,
          isActive: validated.isActive,
          deadline: validated.deadline ? new Date(validated.deadline) : null,
          isLocked: validated.isLocked,
          classes: {
            deleteMany: {},
            create: validated.classIds.map((classId) => ({
              classId,
            })),
          },
        },
      });

      // 2. Handle components update
      // Strategy: Delete all existing components and recreate them.
      // This is simpler given we need to re-validate weights anyway.
      // NOTE: This will fail if there are existing scores linked to components.
      // So we should check if scores exist first.

      const hasScores = await tx.assessmentScore.count({
        where: { templateId },
      });

      if (hasScores > 0) {
        throw new Error(
          "Cannot modify components because scores have already been recorded using this template. Create a new template instead.",
        );
      }

      await tx.assessmentComponent.deleteMany({
        where: { templateId },
      });

      await tx.assessmentComponent.createMany({
        data: validated.components.map((comp, index) => ({
          templateId,
          name: comp.name,
          componentType: comp.componentType,
          maxMarks: comp.maxMarks,
          weight: comp.weight,
          displayOrder: index + 1,
          isRequired: comp.isRequired,
          isRepeatable: comp.isRepeatable,
          expectedCount: comp.expectedCount,
        })),
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "OTHER",
        entityId: templateId,
        newValues: {
          name: validated.name,
          components: validated.components.length,
        },
      },
    });

    revalidatePath(
      `/${schoolSlug}/admin/academics/grading/assessment-templates`,
    );

    return {
      success: true,
      message: "Assessment template updated successfully",
    };
  } catch (error) {
    console.error("[UPDATE_ASSESSMENT_TEMPLATE] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update template",
    };
  }
}

// ============================================================================
// DELETE ASSESSMENT TEMPLATE
// ============================================================================

export async function deleteAssessmentTemplate(
  schoolSlug: string,
  templateId: string,
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner"
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const template = await prisma.assessmentTemplate.findUnique({
      where: { id: templateId },
      include: {
        _count: {
          select: { assessmentScores: true },
        },
      },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    if (template._count.assessmentScores > 0) {
      return {
        success: false,
        error: "Cannot delete template because it has associated scores.",
      };
    }

    await prisma.assessmentTemplate.delete({
      where: { id: templateId },
    });

    revalidatePath(
      `/${schoolSlug}/admin/academics/grading/assessment-templates`,
    );

    return {
      success: true,
      message: "Template deleted successfully",
    };
  } catch (error) {
    console.error("[DELETE_ASSESSMENT_TEMPLATE] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete template",
    };
  }
}
