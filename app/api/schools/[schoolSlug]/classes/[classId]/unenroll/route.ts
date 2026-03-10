import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import * as z from "zod";

const unenrollSchema = z.object({
  studentId: z.string(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; classId: string }> },
) {
  try {
    const { schoolSlug, classId } = await params;
    await requireSchoolAccess(schoolSlug);

    const body = await request.json();
    const { studentId } = unenrollSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Unenroll student from class
    // We update the classId on the Student record to null
    // And possibly update or archive the Enrollment record if we want to keep history
    await prisma.$transaction([
      prisma.student.update({
        where: { id: studentId, schoolId: school.id },
        data: { classId: null },
      }),
      // We could also delete or mark the enrollment as COMPLETED/WITHDRAWN
      prisma.enrollment.updateMany({
        where: {
          studentId,
          classId,
          status: "ACTIVE",
        },
        data: {
          status: "WITHDRAWN",
          completedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error unenrolling student:", error);
    return NextResponse.json(
      { error: "Failed to unenroll student" },
      { status: 500 },
    );
  }
}
