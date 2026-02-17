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
    const { name, code, description, isSchoolDefault, isActive } =
      updateGradingSystemSchema.parse(body);

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

    const gradingSystem = await prisma.gradingSystem.update({
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

    return NextResponse.json(gradingSystem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
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
