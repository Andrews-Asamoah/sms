import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateGradingSystemSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less")
    .optional(),
  description: z.string().optional(),
  isSchoolDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  gradeScales: z
    .array(
      z.object({
        grade: z.string().min(1),
        description: z.string().min(1),
        minScore: z.number().min(0).max(100),
        maxScore: z.number().min(0).max(100),
        gradePoint: z.number().min(0),
        displayOrder: z.number(),
      }),
    )
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string; gradingId: string }> },
) {
  try {
    const { schoolSlug, gradingId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      code,
      description,
      isSchoolDefault,
      isActive,
      gradeScales = [],
    } = updateGradingSystemSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return new NextResponse("School not found", { status: 404 });
    }

    if (code) {
      const existingSystem = await prisma.gradingSystem.findUnique({
        where: {
          code_schoolId: {
            code,
            schoolId: school.id,
          },
        },
      });

      if (existingSystem && existingSystem.id !== gradingId) {
        return new NextResponse("Grading system code already exists", {
          status: 409,
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // If setting as default, unset others for this school
      if (isSchoolDefault === true) {
        await tx.gradingSystem.updateMany({
          where: {
            schoolId: school.id,
            isSchoolDefault: true,
            id: { not: gradingId },
          },
          data: { isSchoolDefault: false },
        });
      }

      // Update basic fields
      const updatedSystem = await tx.gradingSystem.update({
        where: {
          id: gradingId,
          schoolId: school.id,
        },
        data: {
          name,
          code,
          description,
          isSchoolDefault,
          isActive,
        },
      });

      // Update grade scales if provided
      if (body.gradeScales) {
        // Delete existing scales
        await tx.gradeScale.deleteMany({
          where: { gradingSystemId: gradingId },
        });

        // Create new scales
        if (gradeScales.length > 0) {
          await tx.gradeScale.createMany({
            data: gradeScales.map((gs) => ({
              gradingSystemId: gradingId,
              grade: gs.grade,
              description: gs.description,
              minScore: gs.minScore,
              maxScore: gs.maxScore,
              gradePoint: gs.gradePoint,
              displayOrder: gs.displayOrder,
            })),
          });
        }
      }

      return updatedSystem;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.flatten()), { status: 400 });
    }
    console.error("[GRADING_SYSTEM_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string; gradingId: string }> },
) {
  try {
    const { schoolSlug, gradingId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return new NextResponse("School not found", { status: 404 });
    }

    // Check for dependencies
    const gradingSystem = await prisma.gradingSystem.findUnique({
      where: { id: gradingId },
      include: {
        _count: {
          select: {
            assessmentTemplates: true,
          },
        },
      },
    });

    if (!gradingSystem) {
      return new NextResponse("Grading system not found", { status: 404 });
    }

    if (gradingSystem._count.assessmentTemplates > 0) {
      return new NextResponse(
        "Cannot delete grading system used in assessment templates",
        { status: 400 },
      );
    }

    await prisma.gradingSystem.delete({
      where: {
        id: gradingId,
        schoolId: school.id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[GRADING_SYSTEM_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
