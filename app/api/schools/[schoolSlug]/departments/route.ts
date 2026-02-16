
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  headOfDeptId: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string }> }
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

    const departments = await prisma.department.findMany({
      where: { schoolId: school.id },
      include: {
        headOfDept: {
          include: {
            profile: true,
          },
        },
        _count: {
          select: {
            subjects: true,
            teachersInDepartment: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("[DEPARTMENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string }> }
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

    const school = await prisma.school.findUnique({
        where: { subdomain: schoolSlug },
        select: { id: true },
      });
  
      if (!school) {
          return new NextResponse("School not found", { status: 404 });
      }

    const body = await request.json();
    const { name, code, description, headOfDeptId } = createDepartmentSchema.parse(body);

    // Check if department code already exists in this school
    const existingDepartment = await prisma.department.findUnique({
      where: {
        code_schoolId: {
          code,
          schoolId: school.id,
        },
      },
    });

    if (existingDepartment) {
      return new NextResponse("Department code already exists", { status: 409 });
    }

    const department = await prisma.department.create({
      data: {
        name,
        code,
        description,
        headOfDeptId: headOfDeptId || null,
        schoolId: school.id,
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
    }
    console.error("[DEPARTMENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
