import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateSubjectSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less")
    .optional(),
  description: z.string().optional(),
  departmentIds: z
    .array(z.string())
    .min(1, "At least one department is required")
    .optional(),
  creditHours: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string; subjectId: string }> },
) {
  try {
    const { schoolSlug, subjectId } = await params;
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
    const { name, code, description, departmentIds, creditHours, isActive } =
      updateSubjectSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return new NextResponse("School not found", { status: 404 });
    }

    // Check code uniqueness if changing
    if (code) {
      const existingSubject = await prisma.subject.findUnique({
        where: {
          code_schoolId: {
            code,
            schoolId: school.id,
          },
        },
      });

      if (existingSubject && existingSubject.id !== subjectId) {
        return new NextResponse("Subject code already exists", { status: 409 });
      }
    }

    // Verify departments if changing
    if (departmentIds) {
      const departments = await prisma.department.findMany({
        where: {
          id: { in: departmentIds },
          schoolId: school.id,
        },
      });

      if (departments.length !== departmentIds.length) {
        return new NextResponse("One or more departments are invalid", {
          status: 400,
        });
      }
    }

    const subject = await prisma.subject.update({
      where: {
        id: subjectId,
        schoolId: school.id,
      },
      data: {
        name,
        code,
        description,
        creditHours,
        isActive,
        departments: departmentIds
          ? {
              set: departmentIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        departments: true,
      },
    });

    revalidatePath(`/${schoolSlug}/admin`, "layout");

    return NextResponse.json(subject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
    }
    console.error("[SUBJECT_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string; subjectId: string }> },
) {
  try {
    const { schoolSlug, subjectId } = await params;
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
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        _count: {
          select: {
            assessmentScores: true,
            classSubjects: true,
            teachers: true,
          },
        },
      },
    });

    if (!subject) {
      return new NextResponse("Subject not found", { status: 404 });
    }

    if (
      subject._count.assessmentScores > 0 ||
      subject._count.classSubjects > 0 ||
      subject._count.teachers > 0
    ) {
      return new NextResponse(
        "Cannot delete subject with associated assessments, classes, or teachers",
        { status: 400 },
      );
    }

    await prisma.subject.delete({
      where: {
        id: subjectId,
        schoolId: school.id,
      },
    });

    revalidatePath(`/${schoolSlug}/admin`, "layout");

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[SUBJECT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
