
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less").optional(),
  description: z.string().optional(),
  promotionPassMark: z.number().nullable().optional(),
  headOfDeptId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string; departmentId: string }> }
) {
  try {
    const { schoolSlug, departmentId } = await params;
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
    const { name, code, description, promotionPassMark, headOfDeptId, isActive } = updateDepartmentSchema.parse(body);

    const school = await prisma.school.findUnique({
        where: { subdomain: schoolSlug },
        select: { id: true },
    });

    if (!school) {
        return new NextResponse("School not found", { status: 404 });
    }

    // Check if updating code and if it conflicts
    if (code) {
        const existingDepartment = await prisma.department.findUnique({
            where: {
                code_schoolId: {
                    code,
                    schoolId: school.id,
                },
            },
        });

        if (existingDepartment && existingDepartment.id !== departmentId) {
            return new NextResponse("Department code already exists", { status: 409 });
        }
    }

    const department = await prisma.department.update({
      where: {
        id: departmentId,
        schoolId: school.id,
      },
      data: {
        name,
        code,
        description,
        promotionPassMark,
        headOfDeptId,
        isActive,
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    if (error instanceof z.ZodError) {
        return new NextResponse("Invalid request data", { status: 400 });
    }
    console.error("[DEPARTMENT_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
    { params }: { params: Promise<{ schoolSlug: string; departmentId: string }> }
) {
  try {
    const { schoolSlug, departmentId } = await params;
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

    // Check for dependencies (students, subjects, teachers)
    const department = await prisma.department.findUnique({
        where: { id: departmentId },
        include: {
            _count: {
                select: {
                    students: true,
                    subjects: true,
                    teachersInDepartment: true,
                }
            }
        }
    });

    if (!department) {
        return new NextResponse("Department not found", { status: 404 });
    }

    if (department._count.students > 0 || department._count.subjects > 0 || department._count.teachersInDepartment > 0) {
        return new NextResponse("Cannot delete department with associated students, subjects, or teachers", { status: 400 });
    }

    await prisma.department.delete({
      where: {
        id: departmentId,
        schoolId: school.id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DEPARTMENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
