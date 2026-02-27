// app/api/schools/[schoolSlug]/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get("classId");
    const dateStr = searchParams.get("date"); // yyyy-mm-dd

    if (!classId || !dateStr) {
      return NextResponse.json(
        { error: "Missing classId or date" },
        { status: 400 },
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 },
      );
    }

    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Permission check for Teachers
    if (role.effectiveRole === "teacher") {
      const isClassTeacher = await prisma.class.findFirst({
        where: {
          id: classId,
          schoolId: school.id,
          classTeacher: {
            profile: {
              userId: session.user.id,
            },
          },
        },
      });

      if (!isClassTeacher) {
        return NextResponse.json(
          { error: "You are not the class teacher for this class" },
          { status: 403 },
        );
      }
    } else if (
      role.effectiveRole !== "owner" &&
      role.effectiveRole !== "admin" &&
      role.effectiveRole !== "headteacher"
    ) {
      return NextResponse.json(
        { error: "Unauthorized to mark attendance" },
        { status: 403 },
      );
    }

    // Get students in the class
    const students = await prisma.student.findMany({
      where: {
        classId,
        schoolId: school.id,
        status: "ACTIVE",
      },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            otherNames: true,
          },
        },
        attendances: {
          where: {
            date: date,
          },
          select: {
            status: true,
            remarks: true,
          },
        },
      },
      orderBy: {
        profile: {
          lastName: "asc",
        },
      },
    });

    // Format response: default to PRESENT if no attendance record exists
    const attendanceData = students.map((student) => ({
      studentId: student.id,
      name: `${student.profile.firstName} ${student.profile.lastName}`,
      status: student.attendances[0]?.status || "PRESENT",
      remarks: student.attendances[0]?.remarks || "",
    }));

    return NextResponse.json({
      classId,
      date: dateStr,
      students: attendanceData,
    });
  } catch (error) {
    console.error("[ATTENDANCE_GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
