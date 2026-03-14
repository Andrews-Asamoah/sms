import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma, EnrollmentStatus, PromotionType } from "@/lib/generated/prisma";

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
          },
          include: {
            componentScores: {
              select: {
                marksObtained: true,
                maxMarks: true,
              }
            }
          }
        }
      }
    });

    const studentData = students.map(student => {
      // Calculate total raw score (sum of all marksObtained across all component scores for this year)
      let totalRawScore = 0;
      let totalMaxScore = 0;
      for (const score of student.assessmentScores) {
        for (const cs of score.componentScores) {
          totalRawScore += Number(cs.marksObtained);
          totalMaxScore += Number(cs.maxMarks);
        }
      }

      // Use total score as percentage if maxScore is available (for comparison with passMark %)
      const rawScore = totalMaxScore > 0 ? (totalRawScore / totalMaxScore) * 100 : 0;
      const hasPassed = passMark !== null ? rawScore >= passMark : false;

      return {
        id: student.id,
        name: `${student.profile.firstName} ${student.profile.lastName}`,
        studentId: student.studentId,
        rawScore,
        totalRawScore,
        totalMaxScore,
        hasPassed,
        status: "PENDING"
      };
    });

    return NextResponse.json({
      passMark,
      isGraduatingClass: classData.isGraduatingClass,
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
      targetAcademicYearId,
      currentAcademicYearId,
      // New format: per-student promotion assignments
      // promotions: Array<{ studentId: string, type: "PROMOTED"|"REPEATED"|"GRADUATED"|"SKIPPED", targetClassId?: string }>
      promotions,
    } = body;

    if (!sourceClassId || !targetAcademicYearId || !Array.isArray(promotions) || promotions.length === 0) {
      return NextResponse.json({ error: "sourceClassId, targetAcademicYearId, and promotions array are required" }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, settings: true },
    });

    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const resolvedCurrentYearId = currentAcademicYearId || (school.settings as { currentAcademicYearId?: string } | null)?.currentAcademicYearId;

    // Validate all non-graduating/repeating promotions have a targetClassId
    const promotedStudents = promotions.filter((p: { type: string }) => p.type === "PROMOTED" || p.type === "SKIPPED");
    const missingTarget = promotedStudents.filter((p: { targetClassId?: string }) => !p.targetClassId);
    if (missingTarget.length > 0) {
      return NextResponse.json({ error: "All PROMOTED and SKIPPED students require a targetClassId" }, { status: 400 });
    }

    const allStudentIds = promotions.map((p: { studentId: string }) => p.studentId);

    await prisma.$transaction(async (tx) => {
      // 1. Mark existing active enrollments for the source class as COMPLETED
      await tx.enrollment.updateMany({
        where: {
          classId: sourceClassId,
          studentId: { in: allStudentIds },
          status: "ACTIVE"
        },
        data: { status: "COMPLETED" }
      });

      // 2. Build promotion records and new enrollments
      const promotionRecords = [];
      const enrollmentsToCreate: Prisma.EnrollmentCreateManyInput[] = [];
      const graduatedStudentIds: string[] = [];

      for (const p of promotions) {
        const { studentId, type, targetClassId, notes, reason } = p;

        promotionRecords.push({
          schoolId: school.id,
          studentId,
          fromClassId: sourceClassId,
          toClassId: type === "REPEATED" ? sourceClassId : (targetClassId || null),
          fromYearId: resolvedCurrentYearId,
          toYearId: targetAcademicYearId,
          promotionType: type as PromotionType,
          promotedById: session.user.id,
          notes: notes || null,
          reason: reason || null,
        });

        if (type === "PROMOTED" || type === "SKIPPED") {
          enrollmentsToCreate.push({
            studentId,
            classId: targetClassId,
            academicYearId: targetAcademicYearId,
            status: EnrollmentStatus.ACTIVE,
          });
        } else if (type === "REPEATED") {
          enrollmentsToCreate.push({
            studentId,
            classId: sourceClassId,
            academicYearId: targetAcademicYearId,
            status: EnrollmentStatus.ACTIVE,
          });
        } else if (type === "GRADUATED") {
          graduatedStudentIds.push(studentId);
        }
      }

      // 3. Create PromotionRecords
      await tx.promotionRecord.createMany({ data: promotionRecords });

      // 4. Create new Enrollments
      if (enrollmentsToCreate.length > 0) {
        await tx.enrollment.createMany({ data: enrollmentsToCreate });
      }

      // 5. Handle Graduated Students
      if (graduatedStudentIds.length > 0) {
        await tx.student.updateMany({
          where: { id: { in: graduatedStudentIds } },
          data: {
            status: "GRADUATED",
            graduationDate: new Date(),
            classId: null
          }
        });

        const gradStudents = await tx.student.findMany({
          where: { id: { in: graduatedStudentIds } },
          select: { profile: { select: { userId: true } } }
        });

        const userIds = gradStudents
          .map(s => s.profile?.userId)
          .filter((id): id is string => !!id);

        if (userIds.length > 0) {
          await tx.member.updateMany({
            where: {
              userId: { in: userIds },
              organization: { school: { id: school.id } }
            },
            data: { banned: true, banReason: "Graduated" }
          });
        }
      }

      // 6. Audit Log
      const promotedCount = promotions.filter((p: { type: string }) => p.type === "PROMOTED").length;
      const repeatedCount = promotions.filter((p: { type: string }) => p.type === "REPEATED").length;
      const graduatedCount = promotions.filter((p: { type: string }) => p.type === "GRADUATED").length;
      const skippedCount = promotions.filter((p: { type: string }) => p.type === "SKIPPED").length;

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE",
          entityType: "CLASS",
          entityId: sourceClassId,
          newValues: {
            event: "End of Year Promotions Executed",
            promotedCount,
            repeatedCount,
            graduatedCount,
            skippedCount,
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
