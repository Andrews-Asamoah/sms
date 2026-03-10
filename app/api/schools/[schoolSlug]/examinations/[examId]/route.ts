import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const componentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  componentType: z.string(),
  maxMarks: z.coerce.number().min(1),
  weight: z.coerce.number().min(0).max(100),
  isRepeatable: z.boolean().optional(),
  expectedCount: z.coerce.number().min(1).optional(),
});

const updateExamSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  gradingSystemId: z.string().min(1, "Grading system is required").optional(),
  classId: z.string().nullable().optional(),
  termNumber: z.coerce.number().int().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  components: z.array(componentSchema).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string; examId: string }> },
) {
  try {
    const { schoolSlug, examId } = await params;
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
      gradingSystemId,
      classId,
      termNumber,
      description,
      isActive,
      components,
    } = updateExamSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return new NextResponse("School not found", { status: 404 });
    }

    if (gradingSystemId) {
      const gradingSystem = await prisma.gradingSystem.findUnique({
        where: { id: gradingSystemId },
      });

      if (!gradingSystem || gradingSystem.schoolId !== school.id) {
        return new NextResponse("Invalid grading system", { status: 400 });
      }
    }

    if (classId) {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
      });
      if (!cls || cls.schoolId !== school.id) {
        return new NextResponse("Invalid class", { status: 400 });
      }
    }

    const exam = await prisma.$transaction(async (tx) => {
      if (components) {
        // Delete existing components if they exist and no scores are recorded
        // If scores exist, we should ideally prevent this or handle carefully
        await tx.assessmentComponent.deleteMany({
          where: { templateId: examId },
        });

        if (components.length > 0) {
          await tx.assessmentComponent.createMany({
            data: components.map((c, index) => ({
              templateId: examId,
              name: c.name,
              componentType: c.componentType as any,
              maxMarks: c.maxMarks,
              weight: c.weight,
              displayOrder: index,
              isRepeatable: c.isRepeatable ?? false,
              expectedCount: c.expectedCount ?? 1,
            })),
          });
        }
      }

      return await tx.assessmentTemplate.update({
        where: {
          id: examId,
          schoolId: school.id,
        },
        data: {
          name,
          gradingSystemId,
          classId: classId !== undefined ? classId : undefined,
          termNumber,
          description,
          isActive,
        },
        include: {
          gradingSystem: true,
          class: true,
          components: true,
        },
      });
    });

    return NextResponse.json(exam);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
    }
    console.error("[EXAM_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string; examId: string }> },
) {
  try {
    const { schoolSlug, examId } = await params;
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
    const exam = await prisma.assessmentTemplate.findUnique({
      where: { id: examId },
      include: {
        _count: {
          select: {
            assessmentScores: true,
          },
        },
      },
    });

    if (!exam) {
      return new NextResponse("Examination not found", { status: 404 });
    }

    if (exam._count.assessmentScores > 0) {
      return new NextResponse(
        "Cannot delete examination with recorded scores",
        { status: 400 },
      );
    }

    await prisma.assessmentTemplate.delete({
      where: {
        id: examId,
        schoolId: school.id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[EXAM_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
