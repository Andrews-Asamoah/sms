// app/api/schools/[schoolSlug]/classes/[classId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateClassSchema = z.object({
  name: z.string().min(1).optional(),
  level: z.string().min(1).optional(),
  section: z.string().optional(),
  capacity: z.number().nullable().optional(),
  academicYearId: z.string().min(1).optional(),
  classTeacherId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  schoolId: z.string().min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; classId: string }> }
) {
  try {
    const { schoolSlug, classId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Check authorization
    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateClassSchema.parse(body);

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug, id: validatedData.schoolId },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Verify class exists and belongs to school
    const existingClass = await prisma.class.findUnique({
      where: {
        id: classId,
        schoolId: school.id,
      },
    });

    if (!existingClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Verify academic year belongs to school if provided
    if (validatedData.academicYearId) {
      const academicYear = await prisma.academicYear.findUnique({
        where: {
          id: validatedData.academicYearId,
          schoolId: school.id,
        },
      });

      if (!academicYear) {
        return NextResponse.json(
          { error: "Academic year not found" },
          { status: 404 }
        );
      }
    }

    // Verify teacher belongs to school if provided
    if (validatedData.classTeacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: {
          id: validatedData.classTeacherId,
          schoolId: school.id,
        },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher not found" },
          { status: 404 }
        );
      }
    }

    // Check for duplicate class name if name is being changed
    if (validatedData.name && validatedData.name !== existingClass.name) {
      const duplicateClass = await prisma.class.findFirst({
        where: {
          name: validatedData.name,
          academicYearId:
            validatedData.academicYearId || existingClass.academicYearId,
          schoolId: school.id,
          id: { not: classId },
        },
      });

      if (duplicateClass) {
        return NextResponse.json(
          {
            error:
              "A class with this name already exists in this academic year",
          },
          { status: 409 }
        );
      }
    }

    // Update class
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.level && { level: validatedData.level }),
        ...(validatedData.section !== undefined && {
          section: validatedData.section || null,
        }),
        ...(validatedData.capacity !== undefined && {
          capacity: validatedData.capacity,
        }),
        ...(validatedData.academicYearId && {
          academicYearId: validatedData.academicYearId,
        }),
        ...(validatedData.classTeacherId !== undefined && {
          classTeacherId: validatedData.classTeacherId,
        }),
        ...(validatedData.isActive !== undefined && {
          isActive: validatedData.isActive,
        }),
      },
      include: {
        academicYear: true,
        classTeacher: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Class",
        entityId: updatedClass.id,
        oldValues: existingClass,
        newValues: updatedClass,
      },
    });

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error("[CLASS_PATCH]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; classId: string }> }
) {
  try {
    const { schoolSlug, classId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Check authorization
    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Verify class exists and belongs to school
    const existingClass = await prisma.class.findUnique({
      where: {
        id: classId,
        schoolId: school.id,
      },
      include: {
        _count: {
          select: {
            students: true,
            enrollments: true,
          },
        },
      },
    });

    if (!existingClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check if class has students or enrollments
    if (
      existingClass._count.students > 0 ||
      existingClass._count.enrollments > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot delete class with existing students or enrollments. Please transfer or remove students first.",
        },
        { status: 400 }
      );
    }

    // Delete class
    await prisma.class.delete({
      where: { id: classId },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "Class",
        entityId: classId,
        oldValues: existingClass,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CLASS_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
