import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import * as z from "zod";

const enrollSchema = z.object({
  studentIds: z.array(z.string()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; classId: string }> },
) {
  try {
    const { schoolSlug, classId } = await params;
    await requireSchoolAccess(schoolSlug);

    const body = await request.json();
    const { studentIds } = enrollSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { academicYearId: true },
    });

    if (!classRecord) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Get current term from school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { settings: true },
    });
    const currentTermId = (schoolSettings?.settings as Record<string, string> | null)?.currentTermId ?? null;

    if (!currentTermId) {
      return NextResponse.json(
        { error: "Current Term not set. Please configure it in school settings first." },
        { status: 400 },
      );
    }

    // Enroll students in class
    await prisma.$transaction(
      studentIds.map((studentId) =>
        prisma.student.update({
          where: { id: studentId, schoolId: school.id },
          data: {
            classId: classId,
            enrollments: {
              create: {
                classId: classId,
                academicYearId: classRecord.academicYearId,
                termId: currentTermId,
                status: "ACTIVE",
              },
            },
          },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error enrolling students:", error);
    return NextResponse.json(
      { error: "Failed to enroll students" },
      { status: 500 },
    );
  }
}
