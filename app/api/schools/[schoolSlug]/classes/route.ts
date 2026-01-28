// app/api/schools/[schoolSlug]/classes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

// FIXED: Make section optional or nullable
const createClassSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  level: z.string().min(1, "Level is required"),
  section: z.string().optional().nullable(), // Changed from just string
  capacity: z.number().int().positive().optional().nullable(),
  classTeacherId: z.string().optional().nullable(),
  academicYearId: z.string().min(1, "Academic year is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  try {
    const { schoolSlug } = await params;

    // Check authentication and authorization
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createClassSchema.parse(body);

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Verify academic year belongs to this school
    const academicYear = await prisma.academicYear.findFirst({
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

    // If classTeacherId is provided, verify it belongs to this school
    if (validatedData.classTeacherId) {
      const teacher = await prisma.teacher.findFirst({
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

    // Check if class with same name already exists in this academic year
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
        { status: 400 }
      );
    }

    // Create the class
    const newClass = await prisma.class.create({
      data: {
        name: validatedData.name,
        level: validatedData.level,
        section: validatedData.section || null, // Ensure null instead of undefined
        capacity: validatedData.capacity || null,
        classTeacherId: validatedData.classTeacherId || null,
        academicYearId: validatedData.academicYearId,
        schoolId: school.id,
        isActive: true,
      },
      include: {
        classTeacher: {
          include: {
            profile: true,
          },
        },
        academicYear: true,
      },
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error("[CLASSES_POST] Error", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to list all classes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  try {
    const { schoolSlug } = await params;

    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const classes = await prisma.class.findMany({
      where: { schoolId: school.id },
      include: {
        classTeacher: {
          include: {
            profile: true,
          },
        },
        academicYear: true,
        _count: {
          select: {
            students: true,
            subjects: true,
          },
        },
      },
      orderBy: [
        { academicYear: { startDate: "desc" } },
        { level: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error("[CLASSES_GET] Error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
