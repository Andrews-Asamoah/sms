import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

/**
 * GET /api/schools/[schoolSlug]/timetable
 * Query Params: classId, teacherId, studentId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const departmentId = searchParams.get("departmentId");
  const teacherId = searchParams.get("teacherId");
  const studentId = searchParams.get("studentId");

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    let targetClassId = classId;
    let targetDepartmentId = departmentId;

    if (studentId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId, status: "ACTIVE" },
        include: { class: true },
        orderBy: { createdAt: "desc" },
      });
      if (enrollment) {
        targetClassId = enrollment.classId;
        targetDepartmentId = enrollment.class.departmentId;
      }
    } else if (classId) {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
        select: { departmentId: true },
      });
      if (cls) targetDepartmentId = cls.departmentId;
    }

    const where: any = { schoolId: school.id };

    if (teacherId) {
      where.teacherId = teacherId;
    } else {
      // For Class/Department view, we want both class-specific and department-wide entries
      where.OR = [];
      if (targetClassId) where.OR.push({ classId: targetClassId });
      if (targetDepartmentId) where.OR.push({ departmentId: targetDepartmentId });
      
      if (where.OR.length === 0 && !departmentId) {
         // Fallback if nothing selected
         delete where.OR;
      }
    }

    const entries = await prisma.timetableEntry.findMany({
      where,
      include: {
        subject: { select: { name: true, code: true } },
        teacher: {
          include: { profile: { select: { firstName: true, lastName: true } } },
        },
        timeSlot: true,
        classroom: true,
      },
      orderBy: [
        { timeSlot: { dayOfWeek: "asc" } },
        { timeSlot: { startTime: "asc" } },
      ],
    });

    // Handle overrides: If a class has a specific entry for the same time slot as a department entry, 
    // the class entry wins.
    const mergedEntries = entries.reduce((acc: any[], current) => {
      if (current.classId) {
        // Class entries always win or are added
        const index = acc.findIndex(e => e.timeSlotId === current.timeSlotId && !e.classId);
        if (index !== -1) {
          acc[index] = current; // Override department entry
        } else {
          acc.push(current);
        }
      } else {
        // Department entry: only add if no class entry exists for this slot yet
        const exists = acc.some(e => e.timeSlotId === current.timeSlotId && e.classId);
        if (!exists) acc.push(current);
      }
      return acc;
    }, []);

    return NextResponse.json(mergedEntries);
  } catch (error) {
    console.error("Timetable Fetch Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      classId,
      departmentId,
      subjectId,
      teacherId,
      timeSlotId,
      classroomId,
      academicYearId,
    } = body;

    if (!classId && !departmentId) {
      return NextResponse.json({ error: "Class or Department is required" }, { status: 400 });
    }

    // Check for collisions
    const collision = await prisma.timetableEntry.findFirst({
      where: {
        schoolId: school.id,
        timeSlotId,
        academicYearId,
        OR: [
          classId ? { classId } : {},
          departmentId ? { departmentId } : {},
          { teacherId },
          classroomId ? { classroomId } : {},
        ].filter(cond => Object.keys(cond).length > 0),
      },
    });

    if (collision) {
      return NextResponse.json(
        { error: "Scheduling conflict detected for this time slot" },
        { status: 409 },
      );
    }

    const entry = await prisma.timetableEntry.create({
      data: {
        schoolId: school.id,
        classId: classId || null,
        departmentId: departmentId || null,
        subjectId,
        teacherId,
        timeSlotId,
        classroomId: classroomId || null,
        academicYearId,
      },
      include: {
        subject: { select: { name: true, code: true } },
        teacher: {
          include: { profile: { select: { firstName: true, lastName: true } } },
        },
        timeSlot: true,
        classroom: true,
      }
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Timetable Create Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
