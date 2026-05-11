import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DayOfWeek } from "@prisma/client";

import { format } from "date-fns";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, academicYears: { where: { isCurrent: true }, select: { id: true } } },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const currentYearId = school.academicYears[0]?.id;
    if (!currentYearId) {
      return NextResponse.json({ error: "No current academic year found" }, { status: 400 });
    }

    // Find teacher profile for the current user
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId: school.id,
        profile: {
          userId: session.user.id
        }
      },
      select: { id: true }
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    // Get current day of week in uppercase (e.g., MONDAY)
    const currentDay = format(new Date(), "EEEE").toUpperCase() as DayOfWeek;

    const entries = await prisma.timetableEntry.findMany({
      where: {
        schoolId: school.id,
        teacherId: teacher.id,
        academicYearId: currentYearId,
        timeSlot: {
          dayOfWeek: currentDay
        }
      },
      include: {
        subject: { select: { name: true, code: true } },
        class: { select: { name: true } },
        timeSlot: { select: { startTime: true, endTime: true, dayOfWeek: true } },
        classroom: { select: { name: true } },
      },
      orderBy: {
        timeSlot: {
          startTime: "asc"
        }
      }
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("[TEACHER_TIMETABLE_TODAY_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
