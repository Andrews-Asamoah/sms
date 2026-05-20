import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyApiSchoolAccess } from "@/lib/auth/guards";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const access = await verifyApiSchoolAccess(schoolSlug, ["teacher"]);
  if (!access.authorized) return access.errorResponse;
  const { session } = access;

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

    const entries = await prisma.timetableEntry.findMany({
      where: {
        schoolId: school.id,
        teacherId: teacher.id,
        academicYearId: currentYearId,
      },
      include: {
        subject: { select: { name: true, code: true } },
        class: { select: { name: true } },
        timeSlot: { select: { startTime: true, endTime: true, dayOfWeek: true } },
        classroom: { select: { name: true } },
      },
      orderBy: [
        { timeSlot: { dayOfWeek: "asc" } },
        { timeSlot: { startTime: "asc" } },
      ]
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("[TEACHER_TIMETABLE_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
