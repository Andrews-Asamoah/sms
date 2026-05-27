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
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
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

    // Find all classes the teacher teaches (either as class teacher or subject teacher)
    const [classesAsTeacher, classesAsSubjectTeacher] = await Promise.all([
      prisma.class.findMany({
        where: { schoolId: school.id, classTeacherId: teacher.id },
        select: { id: true, name: true, _count: { select: { students: true } } }
      }),
      prisma.classSubject.findMany({
        where: { teacherId: teacher.id, class: { schoolId: school.id } },
        select: { class: { select: { id: true, name: true, _count: { select: { students: true } } } } }
      })
    ]);

    const teacherClassIds = new Set([
      ...classesAsTeacher.map(c => c.id),
      ...classesAsSubjectTeacher.map(cs => cs.class.id)
    ]);

    const classStudentCounts = new Map<string, number>();
    classesAsTeacher.forEach(c => classStudentCounts.set(c.id, c._count.students));
    classesAsSubjectTeacher.forEach(cs => classStudentCounts.set(cs.class.id, cs.class._count.students));

    // Fetch active assessments for these classes
    const assessments = await prisma.assessmentTemplate.findMany({
      where: {
        schoolId: school.id,
        isActive: true,
        OR: [
          { classId: { in: Array.from(teacherClassIds) } },
          { classes: { some: { classId: { in: Array.from(teacherClassIds) } } } },
          { classId: null } // Global assessments (might need filtering by subjectCode too)
        ]
      },
      include: {
        class: { select: { name: true, _count: { select: { students: true } } } },
        _count: {
          select: { assessmentScores: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    // Map to include total students for progress calculation
    const result = assessments.map(a => {
      let totalStudents = 0;
      if (a.classId) {
        totalStudents = classStudentCounts.get(a.classId) || a.class?._count.students || 0;
      } else {
        // For global assessments, we might need a different logic, 
        // but for now let's use a fallback or sum of all teacher's students if subject matches
        totalStudents = Array.from(classStudentCounts.values()).reduce((a, b) => a + b, 0);
      }

      return {
        ...a,
        totalStudents
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[TEACHER_ASSESSMENTS_ACTIVE_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
