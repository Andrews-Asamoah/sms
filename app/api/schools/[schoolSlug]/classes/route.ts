// app/api/schools/[schoolSlug]/classes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createClassSchema = z.object({
  name: z.string().min(1),
  level: z.string().min(1),
  section: z.string().optional(),
  capacity: z.number().nullable().optional(),
  academicYearId: z.string().min(1),
  classTeacherId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  schoolId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  try {
    const { schoolSlug } = await params;
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
    const validatedData = createClassSchema.parse(body);

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug, id: validatedData.schoolId },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Verify academic year belongs to school
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

    // Check for duplicate class name in the same academic year
    const existingClass = await prisma.class.findFirst({
      where: {
        name: validatedData.name,
        academicYearId: validatedData.academicYearId,
        schoolId: school.id,
      },
    });

    if (existingClass) {
      return NextResponse.json(
        {
          error: "A class with this name already exists in this academic year",
        },
        { status: 409 }
      );
    }

    // Create class
    const newClass = await prisma.class.create({
      data: {
        name: validatedData.name,
        level: validatedData.level,
        section: validatedData.section || null,
        capacity: validatedData.capacity || null,
        academicYearId: validatedData.academicYearId,
        classTeacherId: validatedData.classTeacherId || null,
        isActive: validatedData.isActive,
        schoolId: school.id,
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
        action: "CREATE",
        entityType: "Class",
        entityId: newClass.id,
        newValues: newClass,
      },
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error("[CLASSES_POST]", error);

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
