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
    const { name, code, description, isSchoolDefault, isActive } =
      createGradingSystemSchema.parse(body);

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

    // If setting as default, unset others?
    // The schema allows multiple defaults? No logic in schema, but usually one default.
    // For now, let's just create it. Logic for ensuring single default can be added if needed.

    const gradingSystem = await prisma.gradingSystem.create({
      data: {
        name,
        code,
        description,
        isSchoolDefault,
        isActive,
        schoolId: school.id,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(gradingSystem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
    }
    console.error("[GRADING_SYSTEMS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
