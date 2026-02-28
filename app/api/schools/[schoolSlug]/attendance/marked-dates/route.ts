// app/api/schools/[schoolSlug]/attendance/marked-dates/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { format, startOfMonth, endOfMonth } from "date-fns";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const month = searchParams.get("month"); // expect YYYY-MM

    if (!classId) {
      return NextResponse.json({ error: "Class ID required" }, { status: 400 });
    }

    const session = await requireSchoolAccess(schoolSlug);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Determine range
    let startDate: Date;
    let endDate: Date;

    if (month) {
      const parentDate = new Date(`${month}-01`);
      startDate = startOfMonth(parentDate);
      endDate = endOfMonth(parentDate);
    } else {
      // Default to current month if not specified
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    }

    // Find all unique dates with attendance for this class in this range
    const attendanceDates = await prisma.attendance.groupBy({
      by: ["date"],
      where: {
        student: {
          schoolId: school.id,
          classId,
        },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return NextResponse.json({
      dates: attendanceDates.map((item) => format(item.date, "yyyy-MM-dd")),
    });
  } catch (error) {
    console.error("[Attendance Marked Dates] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch marked dates" },
      { status: 500 },
    );
  }
}
