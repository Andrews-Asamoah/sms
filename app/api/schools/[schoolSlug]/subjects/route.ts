import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createSubjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  departmentIds: z
    .array(z.string())
    .min(1, "At least one department is required"),
  creditHours: z.number().int().min(0).default(1),
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

    const subjects = await prisma.subject.findMany({
      where: { schoolId: school.id },
      include: {
        departments: {
          select: {
            id: true,
            name: true,
          },
        },
        teachers: {
          select: {
            teacherId: true,
          },
        },
        _count: {
          select: {
            teachers: true,
            classSubjects: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error("[SUBJECTS_GET]", error);
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
    const { name, code, description, departmentIds, creditHours, isActive } =
      createSubjectSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return new NextResponse("School not found", { status: 404 });
    }

    // Check if subject code already exists in this school
    const existingSubject = await prisma.subject.findUnique({
      where: {
        code_schoolId: {
          code,
          schoolId: school.id,
        },
      },
    });

    if (existingSubject) {
      return new NextResponse("Subject code already exists", { status: 409 });
    }

    // Verify departments belong to school
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

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        description,
        creditHours,
        isActive,
        schoolId: school.id,
        departments: {
          connect: departmentIds.map((id) => ({ id })),
        },
      },
      include: {
        departments: true,
      },
    });

    // Clear the Next.js router cache for all admin pages to ensure the new subject appears in dropdowns immediately
    revalidatePath(`/${schoolSlug}/admin`, "layout");

    return NextResponse.json(subject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
    }
    console.error("[SUBJECTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
