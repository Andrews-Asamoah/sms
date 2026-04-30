import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { TimetableEntryType } from "@/lib/generated/prisma/client";

/**
 * GET /api/schools/[schoolSlug]/timetable
 * Query Params: classId, departmentId, teacherId, studentId
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
      where.OR = [];
      if (targetClassId) where.OR.push({ classId: targetClassId });
      if (targetDepartmentId) where.OR.push({ departmentId: targetDepartmentId });
      if (where.OR.length === 0) delete where.OR;
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

    // Class-level entries override department-level entries for the same time slot
    const mergedEntries = entries.reduce((acc: any[], current) => {
      if (current.classId) {
        const index = acc.findIndex(
          (e) => e.timeSlotId === current.timeSlotId && !e.classId,
        );
        if (index !== -1) {
          acc[index] = current;
        } else {
          acc.push(current);
        }
      } else {
        const exists = acc.some(
          (e) => e.timeSlotId === current.timeSlotId && e.classId,
        );
        if (!exists) acc.push(current);
      }
      return acc;
    }, []);

    return NextResponse.json(mergedEntries);
  } catch (error) {
    console.error("[TIMETABLE_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/schools/[schoolSlug]/timetable
 * Creates a timetable entry. Supports three types:
 *   LESSON   — requires subjectId; teacher auto-inferred from class/subject assignment
 *   BREAK    — no subject/teacher; requires label (e.g. "Lunch")
 *   ACTIVITY — no teacher required; label required (e.g. "Worship", "P.E.")
 */
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
      type = "LESSON",
      label,
      subjectId,
      timeSlotId,
      classroomId: rawClassroomId,
      academicYearId,
    } = body;

    const classroomId = !rawClassroomId || rawClassroomId === "none" ? null : rawClassroomId;
    const entryType = type as TimetableEntryType;

    if (!classId && !departmentId) {
      return NextResponse.json(
        { error: "Class or Department is required" },
        { status: 400 },
      );
    }

    if (!timeSlotId || !academicYearId) {
      return NextResponse.json(
        { error: "Time slot and academic year are required" },
        { status: 400 },
      );
    }

    // ── Type-specific validation ──────────────────────────────────────────────
    let inferredTeacherId: string | null = null;

    if (entryType === "LESSON") {
      if (!subjectId) {
        return NextResponse.json(
          { error: "Subject is required for a lesson entry" },
          { status: 400 },
        );
      }

      // Auto-infer teacher: class-level assignment takes priority
      if (classId) {
        const classSubject = await prisma.classSubject.findUnique({
          where: { classId_subjectId: { classId, subjectId } },
          select: { teacherId: true },
        });
        if (classSubject?.teacherId) inferredTeacherId = classSubject.teacherId;
      }

      if (!inferredTeacherId) {
        const subjectTeacher = await prisma.subjectTeacher.findFirst({
          where: { subjectId },
          select: { teacherId: true },
        });
        if (subjectTeacher) inferredTeacherId = subjectTeacher.teacherId;
      }
      // No teacher linked is fine for LESSON now (e.g. new subject not yet assigned)
    }

    if (entryType === "BREAK" && !label) {
      return NextResponse.json(
        { error: "A label is required for break entries (e.g. \"Lunch Break\")" },
        { status: 400 },
      );
    }

    if (entryType === "ACTIVITY" && !label && !subjectId) {
      return NextResponse.json(
        { error: "An activity must have either a label or a subject" },
        { status: 400 },
      );
    }

    // ── Conflict detection ───────────────────────────────────────────────────
    // Skip conflict check for BREAKs — they intentionally occupy the same slot for all
    if (entryType !== "BREAK") {
      const conflictConditions: any[] = [];
      if (classId) conflictConditions.push({ classId });
      if (departmentId) conflictConditions.push({ departmentId });
      if (inferredTeacherId) conflictConditions.push({ teacherId: inferredTeacherId });
      if (classroomId) conflictConditions.push({ classroomId });

      if (conflictConditions.length > 0) {
        const collision = await prisma.timetableEntry.findFirst({
          where: {
            schoolId: school.id,
            timeSlotId,
            academicYearId,
            OR: conflictConditions,
          },
        });

        if (collision) {
          return NextResponse.json(
            { error: "Scheduling conflict detected for this time slot" },
            { status: 409 },
          );
        }
      }
    }

    // ── Create entry ─────────────────────────────────────────────────────────
    const entry = await prisma.timetableEntry.create({
      data: {
        schoolId: school.id,
        classId: classId || null,
        departmentId: departmentId || null,
        type: entryType,
        label: label || null,
        subjectId: subjectId || null,
        teacherId: inferredTeacherId,
        timeSlotId,
        classroomId,
        academicYearId,
      },
      include: {
        subject: { select: { name: true, code: true } },
        teacher: {
          include: { profile: { select: { firstName: true, lastName: true } } },
        },
        timeSlot: true,
        classroom: true,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "An entry already exists for this class/department in this time slot" },
        { status: 409 },
      );
    }
    console.error("[TIMETABLE_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
