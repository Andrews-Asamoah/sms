// app/api/schools/[schoolSlug]/attendance/mark/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole, getActiveSchoolRole } from "@/lib/auth/school-access";

const markAttendanceSchema = z.object({
  classId: z.string().min(1),
  date: z.string().min(1), // yyyy-mm-dd
  attendances: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.enum([
        "PRESENT",
        "ABSENT",
        "LATE",
        "EXCUSED",
        "SICK",
        "PERMISSION",
      ]),
      remarks: z.string().optional(),
    }),
  ),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const activeRole = await getActiveSchoolRole(session, schoolSlug);

    if (!activeRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const role = activeRole;

    const body = await request.json();
    const validatedData = markAttendanceSchema.parse(body);
    const date = new Date(validatedData.date);

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
          id: validatedData.classId,
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

    // Upsert attendance records
    // We use a transaction to ensure all or nothing
    await prisma.$transaction(
      validatedData.attendances.map((att) =>
        prisma.attendance.upsert({
          where: {
            studentId_date: {
              studentId: att.studentId,
              date: date,
            },
          },
          update: {
            status: att.status,
            remarks: att.remarks,
            markedById: session.user.id,
            markedAt: new Date(),
          },
          create: {
            studentId: att.studentId,
            date: date,
            status: att.status,
            remarks: att.remarks,
            markedById: session.user.id,
          },
        }),
      ),
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ATTENDANCE_MARKED",
        entityType: "Class",
        entityId: validatedData.classId,
        newValues: {
          date: validatedData.date,
          count: validatedData.attendances.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance marked successfully",
    });
  } catch (error) {
    console.error("[ATTENDANCE_POST] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
