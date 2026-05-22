// app/api/schools/[schoolSlug]/attendance/remind/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { format } from "date-fns";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;

    // Only admins or automated systems should call this
    // For now, let's allow it if the user has admin/owner access
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !role ||
      !["admin", "owner", "headteacher"].includes(role.effectiveRole)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, name: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all active classes with their teacher user IDs
    const classes = await prisma.class.findMany({
      where: {
        schoolId: school.id,
        isActive: true,
        classTeacherId: { not: null },
      },
      select: {
        id: true,
        name: true,
        classTeacher: {
          select: {
            profile: { select: { userId: true } },
          },
        },
        students: { select: { id: true } },
      },
    });

    // Single batch query: which classes already have attendance today?
    const markedToday = await prisma.attendance.groupBy({
      by: ["studentId"],
      where: {
        date: today,
        student: {
          schoolId: school.id,
          classId: { in: classes.map((c) => c.id) },
        },
      },
    });

    // Get distinct class IDs that have at least one record today
    const attendedClassStudents = await prisma.attendance.findMany({
      where: {
        date: today,
        student: {
          schoolId: school.id,
          classId: { in: classes.map((c) => c.id) },
        },
      },
      select: { student: { select: { classId: true } } },
      distinct: ["studentId"],
    });

    const classesWithAttendance = new Set(
      attendedClassStudents.map((a) => a.student.classId).filter(Boolean),
    );

    // Build notification payloads for classes that have NOT been marked
    const notificationsToCreate = classes
      .filter(
        (cls) =>
          !classesWithAttendance.has(cls.id) &&
          cls.classTeacher?.profile?.userId,
      )
      .map((cls) => ({
        schoolId: school.id,
        userId: cls.classTeacher!.profile!.userId,
        type: "GENERAL" as const,
        title: "Attendance Reminder",
        message: `Don't forget to mark attendance for class ${cls.name} today.`,
        isRead: false,
      }));

    // Batch-insert all notifications in a single transaction
    if (notificationsToCreate.length > 0) {
      await prisma.$transaction(
        notificationsToCreate.map((n) => prisma.notification.create({ data: n })),
      );
    }

    return NextResponse.json({
      success: true,
      message: `${notificationsToCreate.length} attendance reminders sent successfully.`,
    });
  } catch (error) {
    console.error("[ATTENDANCE_REMIND_POST] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
