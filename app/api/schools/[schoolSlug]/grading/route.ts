import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createGradingSystemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  isSchoolDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
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

    const gradingSystems = await prisma.gradingSystem.findMany({
      where: { schoolId: school.id },
      include: {
        gradeScales: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: {
            gradeScales: true,
            assessmentTemplates: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(gradingSystems);
  } catch (error) {
    console.error("[GRADING_SYSTEMS_GET]", error);
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
      code,
      description,
      isSchoolDefault,
      isActive,
      gradeScales = [],
    } = createGradingSystemSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return new NextResponse("School not found", { status: 404 });
    }

    // Check uniqueness
    const existingSystem = await prisma.gradingSystem.findUnique({
      where: {
        code_schoolId: {
          code,
          schoolId: school.id,
        },
      },
    });

    if (existingSystem) {
      return new NextResponse("Grading system code already exists", {
        status: 409,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // If setting as default, unset others for this school
      if (isSchoolDefault) {
        await tx.gradingSystem.updateMany({
          where: { schoolId: school.id, isSchoolDefault: true },
          data: { isSchoolDefault: false },
        });
      }

      return await tx.gradingSystem.create({
        data: {
          name,
          code,
          description,
          isSchoolDefault,
          isActive,
          schoolId: school.id,
          createdById: session.user.id,
          gradeScales: {
            create: gradeScales.map((gs) => ({
              grade: gs.grade,
              description: gs.description,
              minScore: gs.minScore,
              maxScore: gs.maxScore,
              gradePoint: gs.gradePoint,
              displayOrder: gs.displayOrder,
            })),
          },
        },
        include: {
          gradeScales: true,
        },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.flatten()), { status: 400 });
    }
    console.error("[GRADING_SYSTEMS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
