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

    // 1. Get all active classes for this school
    const classes = await prisma.class.findMany({
      where: {
        schoolId: school.id,
        isActive: true,
        classTeacherId: { not: null },
      },
      include: {
        classTeacher: {
          include: {
            profile: {
              select: { userId: true },
            },
          },
        },
        students: {
          select: { id: true },
        },
      },
    });

    let remindersSent = 0;

    for (const cls of classes) {
      if (!cls.classTeacher?.profile?.userId) continue;

      // 2. Check if any student in this class has an attendance record for today
      const attendanceExist = await prisma.attendance.findFirst({
        where: {
          date: today,
          student: {
            classId: cls.id,
          },
        },
      });

      if (!attendanceExist) {
        // 3. Send notification to the teacher
        await prisma.notification.create({
          data: {
            schoolId: school.id,
            userId: cls.classTeacher.profile.userId,
            type: "GENERAL",
            title: "Attendance Reminder",
            message: `Don't forget to mark attendance for class ${cls.name} today.`,
            isRead: false,
          },
        });
        remindersSent++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${remindersSent} attendance reminders sent successfully.`,
    });
  } catch (error) {
    console.error("[ATTENDANCE_REMIND_POST] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
