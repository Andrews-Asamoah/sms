import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const componentSchema = z.object({
  name: z.string().min(1, "Component name is required"),
  componentType: z.string(),
  maxMarks: z.coerce.number().min(1),
  weight: z.coerce.number().min(0).max(100),
  isRepeatable: z.boolean().optional(),
  expectedCount: z.coerce.number().min(1).optional(),
});

const createExamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gradingSystemId: z.string().min(1, "Grading system is required"),
  classId: z.string().nullable().optional(),
  termNumber: z.coerce.number().int().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  components: z.array(componentSchema).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return new NextResponse("School not found", { status: 404 });
    }

    const exams = await prisma.assessmentTemplate.findMany({
      where: { schoolId: school.id },
      include: {
        gradingSystem: {
          select: {
            id: true,
            name: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            assessmentScores: true,
          },
        },
        components: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(exams);
  } catch (error) {
    console.error("[EXAMS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
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
    } = createExamSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return new NextResponse("School not found", { status: 404 });
    }

    // Verify grading system belongs to school
    const gradingSystem = await prisma.gradingSystem.findUnique({
      where: { id: gradingSystemId },
    });

    if (!gradingSystem || gradingSystem.schoolId !== school.id) {
      return new NextResponse("Invalid grading system", { status: 400 });
    }

    // Verify class if provided
    if (classId) {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
      });
      if (!cls || cls.schoolId !== school.id) {
        return new NextResponse("Invalid class", { status: 400 });
      }
    }

    const exam = await prisma.assessmentTemplate.create({
      data: {
        name,
        gradingSystemId,
        classId: classId || null,
        termNumber,
        description,
        isActive,
        schoolId: school.id,
        components: components ? {
          create: components.map((c, index) => ({
            name: c.name,
            componentType: c.componentType as any,
            maxMarks: c.maxMarks,
            weight: c.weight,
            displayOrder: index,
            isRepeatable: c.isRepeatable ?? false,
            expectedCount: c.expectedCount ?? 1,
          })),
        } : undefined,
      },
      include: {
        gradingSystem: true,
        class: true,
        components: true,
      },
    });

    return NextResponse.json(exam);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
    }
    console.error("[EXAMS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
