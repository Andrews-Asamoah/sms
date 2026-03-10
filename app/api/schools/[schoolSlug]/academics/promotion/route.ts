import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  const { schoolSlug } = await params;
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");

  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, settings: true },
  });

  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  interface SchoolSettings {
    currentAcademicYearId?: string;
    currentTermId?: string;
  }
  const settings = (school.settings as unknown as SchoolSettings) || {};
  const { currentAcademicYearId } = settings;

  try {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        department: { select: { promotionPassMark: true } },
        nextPromotionClass: {
          select: { id: true, name: true }
        }
      }
    });

    if (!classData) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    const passMark = classData.department?.promotionPassMark ? Number(classData.department.promotionPassMark) : null;

    // Fetch students active in this class this year
    const students = await prisma.student.findMany({
      where: {
        schoolId: school.id,
        enrollments: {
          some: {
            classId,
            academicYearId: currentAcademicYearId,
            status: "ACTIVE"
          }
        }
      },
      include: {
        profile: true,
        assessmentScores: {
          where: {
            term: {
              academicYearId: currentAcademicYearId
            }
          }
        }
      }
    });

    const studentData = students.map(student => {
      // Calculate annual raw score (average of all assessments for the year)
      let rawScore = 0;
      if (student.assessmentScores.length > 0) {
        const total = student.assessmentScores.reduce((acc, curr) => acc + Number(curr.percentage), 0);
        rawScore = total / student.assessmentScores.length;
      }

      const hasPassed = passMark !== null ? rawScore >= passMark : false;

      return {
        id: student.id,
        name: `${student.profile.firstName} ${student.profile.lastName}`,
        studentId: student.studentId,
        rawScore,
        hasPassed,
        status: "PENDING"
      };
    });

    return NextResponse.json({
      passMark,
      nextClass: classData.nextPromotionClass,
      students: studentData.sort((a, b) => b.rawScore - a.rawScore), // Highest first
    });
  } catch (error) {
    console.error("[PROMOTIONS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  const { schoolSlug } = await params;
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { 
      sourceClassId, 
      targetClassId, 
      targetAcademicYearId, 
      promotedStudentIds, 
      repeatedStudentIds,
      graduatedStudentIds = [] 
    } = body;

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    // Execute in a transaction
    await prisma.$transaction(async (tx) => {
      const allStudentIds = [...promotedStudentIds, ...repeatedStudentIds, ...graduatedStudentIds];

      // 1. Mark existing active enrollments for the source class as COMPLETED
      await tx.enrollment.updateMany({
        where: {
          classId: sourceClassId,
          studentId: { in: allStudentIds },
          status: "ACTIVE"
        },
        data: {
          status: "COMPLETED"
        }
      });

      // 2. Create new Enrollments for Promoted Students -> targetClassId
      if (promotedStudentIds?.length > 0) {
        if (!targetClassId || !targetAcademicYearId) {
          throw new Error("Target class and academic year are required for promotion.");
        }

        const newEnrollments = promotedStudentIds.map((id: string) => ({
          studentId: id,
          classId: targetClassId,
          academicYearId: targetAcademicYearId,
          status: "ACTIVE",
        }));

        await tx.enrollment.createMany({ data: newEnrollments });
      }

      // 3. Create new Enrollments for Repeated Students -> sourceClassId (but new year)
      if (repeatedStudentIds?.length > 0) {
        if (!targetAcademicYearId) {
          throw new Error("Target academic year is required for repetition.");
        }

        const repeatEnrollments = repeatedStudentIds.map((id: string) => ({
          studentId: id,
          classId: sourceClassId,
          academicYearId: targetAcademicYearId,
          status: "ACTIVE",
        }));
        
        await tx.enrollment.createMany({ data: repeatEnrollments });
      }

      // 4. Handle Graduated Students
      if (graduatedStudentIds?.length > 0) {
        // Update student status
        await tx.student.updateMany({
          where: { id: { in: graduatedStudentIds } },
          data: { 
            status: "GRADUATED",
            graduationDate: new Date(),
            classId: null // No longer in a class
          }
        });

        // Suspend user accounts
        const students = await tx.student.findMany({
          where: { id: { in: graduatedStudentIds } },
          select: { profile: { select: { userId: true } } }
        });

        const userIds = students.map(s => s.profile.userId);

        await tx.member.updateMany({
          where: { 
            userId: { in: userIds },
            organization: { school: { id: school.id } }
          },
          data: { banned: true, banReason: "Graduated" }
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE",
          entityType: "CLASS",
          entityId: sourceClassId,
          newValues: {
            event: "End of Year Promotions Executed",
            promotedCount: promotedStudentIds.length,
            repeatedCount: repeatedStudentIds.length,
            graduatedCount: graduatedStudentIds.length,
            targetYearId: targetAcademicYearId
          }
        }
      });
    });

    return NextResponse.json({ success: true, message: "Promotions successfully applied." });
  } catch (error: any) {
    console.error("[PROMOTIONS_POST]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
