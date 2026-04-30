import { requireSuperAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSystemGradingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
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

export async function GET() {
  try {
    await requireSuperAdmin();

    const gradingSystems = await prisma.gradingSystem.findMany({
      where: { isSystemDefault: true },
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
    console.error("[SYSTEM_GRADING_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSuperAdmin();

    const body = await request.json();
    const { name, code, description, isActive, gradeScales = [] } =
      createSystemGradingSchema.parse(body);

    // Check uniqueness among system defaults (schoolId is null for system defaults)
    const existingSystem = await prisma.gradingSystem.findFirst({
      where: {
        code,
        isSystemDefault: true,
        schoolId: null,
      },
    });

    if (existingSystem) {
      return new NextResponse("A system default with this code already exists", {
        status: 409,
      });
    }

    const result = await prisma.gradingSystem.create({
      data: {
        name,
        code,
        description,
        isSystemDefault: true,
        isSchoolDefault: false,
        isActive,
        schoolId: null,
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
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.flatten()), { status: 400 });
    }
    console.error("[SYSTEM_GRADING_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
