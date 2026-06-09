import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { formatStudentName } from "@/lib/utils/name-formatter";
import { verifyApiSchoolAccess } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ schoolSlug: string; setId: string }> },
) {
  const { schoolSlug, setId } = await params;
  try {
    const access = await verifyApiSchoolAccess(schoolSlug, ["owner", "admin", "headteacher", "teacher"]);
    if (!access.authorized) return access.errorResponse;

    const set = await prisma.reportCardSet.findUnique({
      where: { id: setId },
      include: {
        academicYear: true,
        term: true,
        class: {
          include: {
            department: true,
            classTeacher: { include: { profile: true } },
            students: { where: { status: "ACTIVE" } },
          },
        },
        targetClasses: {
          include: {
            class: {
              include: {
                department: true,
                classTeacher: { include: { profile: true } },
                students: { where: { status: "ACTIVE" } },
              },
            },
          },
        },
      },
    });

    if (!set) {
      return new NextResponse("Report card set not found", { status: 404 });
    }

    // Update status to GENERATING
    await prisma.reportCardSet.update({
      where: { id: setId },
      data: { status: "GENERATING" },
    });

    // Mirror the same class-resolution logic used by the frontend (page.tsx):
    // targetClasses (multi-class) takes priority over the legacy single classId.
    const classIds: string[] =
      set.targetClasses.length > 0
        ? set.targetClasses.map((tc) => tc.classId)
        : set.classId
        ? [set.classId]
        : [];

    if (classIds.length === 0) {
      return new NextResponse("Report card set has no target classes", { status: 400 });
    }

    // Optional class filter from request body — must be one of the set's classes.
    let targetClassIds: string[] = classIds;
    try {
      const body = await req.json();
      if (body?.classId && typeof body.classId === "string" && classIds.includes(body.classId)) {
        targetClassIds = [body.classId];
      }
    } catch {
      // No body or invalid JSON — generate for all classes.
    }

    // Build a lookup map: classId → full class object (with students, teacher, dept)
    const classMap = new Map<string, any>();
    if (set.class) classMap.set(set.class.id, set.class);
    set.targetClasses.forEach((tc) => classMap.set(tc.classId, tc.class));

    // 1. Fetch all students in the selected classes
    const students = await prisma.student.findMany({
      where: { classId: { in: targetClassIds }, schoolId: set.schoolId, status: "ACTIVE" },
      include: {
        profile: {
          include: {
            user: true,
          },
        },
      },
    });

    const school = await prisma.school.findUnique({
      where: { id: set.schoolId },
    });

    // 2. Fetch all assessment scores for these students, term, and academic year
    // Note: Assuming assessment scores are linked to students, subjects, and terms.
    const assessmentScores = await prisma.assessmentScore.findMany({
      where: {
        termId: set.termId,
        studentId: { in: students.map((s) => s.id) },
      },
      include: {
        subject: true,
        componentScores: {
          include: {
            component: true,
          },
        },
      },
    });

    // 2b. Fetch sibling terms with same name to capture duplicate terms remarks
    const siblingTerms = await prisma.term.findMany({
      where: {
        name: set.term.name,
        academicYear: { schoolId: set.schoolId },
      },
      select: { id: true },
    });

    // Also fetch the active term for this school to serve as a fallback
    const activeTerm = await prisma.term.findFirst({
      where: { academicYear: { schoolId: set.schoolId } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const activeTermId = activeTerm?.id;

    // Collect all unique term IDs to query remarks for
    const termIds = Array.from(
      new Set(
        [
          ...siblingTerms.map((t) => t.id),
          set.termId,
          activeTermId,
        ].filter(Boolean) as string[],
      ),
    );

    // Fetch attendance and remarks for these students in this term/siblings
    const [attendanceRecords, studentRemarks] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          studentId: { in: students.map((s) => s.id) },
          date: { gte: set.term.startDate, lte: set.term.endDate },
        },
      }),
      prisma.remark.findMany({
        where: {
          studentId: { in: students.map((s) => s.id) },
          termId: { in: termIds },
        },
      }),
    ]);

    // Fetch the school's grading system
    let gradingSystem = await prisma.gradingSystem.findFirst({
      where: { schoolId: set.schoolId, isSchoolDefault: true },
      include: { gradeScales: { orderBy: { minScore: "desc" } } },
    });

    if (!gradingSystem) {
      gradingSystem = await prisma.gradingSystem.findFirst({
        where: { schoolId: set.schoolId, isActive: true },
        include: { gradeScales: { orderBy: { minScore: "desc" } } },
      });
    }

    if (!gradingSystem) {
      gradingSystem = await prisma.gradingSystem.findFirst({
        where: { isSystemDefault: true },
        include: { gradeScales: { orderBy: { minScore: "desc" } } },
      });
    }

    const scales = gradingSystem?.gradeScales ?? [];

    // 2c. Fetch class teacher and headteacher signature URLs
    const classTeacherProfileIds = new Set<string>();
    classMap.forEach((cls) => {
      if (cls?.classTeacher?.profile?.userId) {
        classTeacherProfileIds.add(cls.classTeacher.profile.userId);
      }
    });

    // Find headteacher member for this school
    const headteacherMember = await prisma.member.findFirst({
      where: {
        organization: { school: { id: set.schoolId } },
        role: { in: ["headteacher", "owner"] },
      },
      include: {
        user: {
          include: {
            userProfile: {
              select: { signatureUrl: true },
            },
          },
        },
      },
    });

    const headteacherSignatureUrl = headteacherMember?.user?.userProfile?.signatureUrl || null;

    // Fetch class teacher signatures
    const teacherSignatures = await prisma.userProfile.findMany({
      where: {
        userId: { in: Array.from(classTeacherProfileIds) },
        signatureUrl: { not: null },
      },
      select: { userId: true, signatureUrl: true },
    });
    const teacherSigMap = new Map(teacherSignatures.map((t) => [t.userId, t.signatureUrl]));

    // Pre-calculate total school days per class (unique attendance dates per class)
    const classTotalDaysMap = new Map<string, number>();
    targetClassIds.forEach((cid) => {
      const classStudentIds = new Set(
        students.filter((s) => s.classId === cid).map((s) => s.id),
      );
      const uniqueDates = new Set(
        attendanceRecords
          .filter((a) => classStudentIds.has(a.studentId))
          .map((a) => a.date.toISOString().split("T")[0]),
      );
      classTotalDaysMap.set(cid, uniqueDates.size);
    });

    // 3. Process scores per student
    const studentResults = students.map((student) => {
      const studentScores = assessmentScores.filter(
        (as) => as.studentId === student.id,
      );

      // Map subjects and calculate grades
      const subjects = studentScores.map((score) => {
        // Calculate dynamic columns based on components
        const classWorkScore = score.componentScores
          .filter((cs) => cs.component.componentType !== "FINAL_EXAM")
          .reduce((sum, cs) => sum + Number(cs.weightedScore), 0);

        const examScore =
          score.componentScores.find(
            (cs) => cs.component.componentType === "FINAL_EXAM",
          )?.weightedScore || 0;

        const scoreValue = Number(score.totalScore);
        
        // Find description from grading scales
        let gradeDescription = "";
        if (scales.length > 0) {
          const sortedScales = [...scales].sort((a, b) => Number(b.minScore) - Number(a.minScore));
          for (const scale of sortedScales) {
            if (scoreValue >= Number(scale.minScore) && scoreValue <= Number(scale.maxScore)) {
              gradeDescription = scale.description;
              break;
            }
          }
        }

        return {
          subjectId: score.subjectId,
          subjectName: score.subject.name,
          subjectCode: score.subject.code,
          classWorkScore: Number(classWorkScore),
          examScore: Number(examScore),
          totalScore: scoreValue,
          percentage: Number(score.percentage),
          grade: score.grade || "N/A",
          gradeValue: parseInt(score.grade || "9") || 9, // For aggregation
          remarks: gradeDescription || score.remarks || "—",
        };
      });

      // Calculate Best of Six Aggregate
      const sortedGrades = [...subjects]
        .map((s) => s.gradeValue)
        .sort((a, b) => a - b);

      const aggregate = sortedGrades.slice(0, 6).reduce((sum, g) => sum + g, 0);

      const totalMarks = subjects.reduce((sum, s) => sum + s.totalScore, 0);
      const averageMarks =
        subjects.length > 0 ? totalMarks / subjects.length : 0;

      // Calculate real attendance
      const studentAttendance = attendanceRecords.filter(a => a.studentId === student.id);
      const presentCount = studentAttendance.filter(a => ["PRESENT", "LATE", "PERMISSION"].includes(a.status)).length;
      const totalPossible = classTotalDaysMap.get(student.classId!) || 0;

      // Get relevant remarks (preferring exact termId match, fallback to siblings, fallback to activeTerm)
      const studentAllRemarks = studentRemarks.filter(r => r.studentId === student.id);
      
      const getRemarkByType = (type: string) => {
        // Priority 1: Exact termId match
        const exactMatch = studentAllRemarks.find(r => r.remarkType === type && r.termId === set.termId);
        if (exactMatch) return exactMatch.content;
        
        // Priority 2: Sibling terms (excluding active term if it is different)
        const siblingMatch = studentAllRemarks.find(
          r => r.remarkType === type && r.termId !== activeTermId
        );
        if (siblingMatch) return siblingMatch.content;

        // Priority 3: Active term fallback
        if (activeTermId) {
          const activeMatch = studentAllRemarks.find(
            r => r.remarkType === type && r.termId === activeTermId
          );
          if (activeMatch) return activeMatch.content;
        }

        return undefined;
      };

      const bRemark = getRemarkByType("BEHAVIORAL");
      const aRemark = getRemarkByType("ACADEMIC");
      const gRemark = getRemarkByType("GENERAL");
      const htRemark = getRemarkByType("HEADTEACHER");

      return {
        studentId: student.id,
        classId: student.classId,
        totalMarks,
        averageMarks,
        aggregate,
        subjects,
        attendance: {
          present: presentCount,
          total: totalPossible,
        },
        behavioral: bRemark,
        academic: aRemark,
        general: gRemark,
        headteacher: htRemark,
      };
    });

    // 4. Calculate Ranks (Positions) — scoped per-class so position reflects
    //    standing within the student's own class, not across the whole set.
    const classGroupMap = new Map<string, typeof studentResults>();
    studentResults.forEach((res) => {
      const cid = res.classId ?? "__unknown__";
      if (!classGroupMap.has(cid)) classGroupMap.set(cid, []);
      classGroupMap.get(cid)!.push(res);
    });

    classGroupMap.forEach((group) => {
      const sorted = [...group].sort((a, b) => b.totalMarks - a.totalMarks);
      let currentRank = 0;
      let lastScore = -1;
      sorted.forEach((res, idx) => {
        if (res.totalMarks !== lastScore) {
          currentRank = idx + 1;
        }
        (res as any).position = currentRank;
        (res as any).outOf = group.length;
        lastScore = res.totalMarks;
      });
    });

    // 5. Save/Update ReportCards
    await prisma.$transaction(
      studentResults.map((res) => {
        const studentInfo = students.find((s) => s.id === res.studentId);

        // Real attendance from processed results
        const attendance = res.attendance;

        const stClassId = res.classId;
        const studentClass = stClassId ? classMap.get(stClassId) : null;

        const reportData = {
          studentName: formatStudentName(
            studentInfo?.profile.firstName,
            studentInfo?.profile.lastName,
            studentInfo?.profile.otherNames
          ),
          studentId: studentInfo?.studentId,
          indexNo: studentInfo?.admissionNumber || studentInfo?.studentId,
          studentEmail: studentInfo?.profile.user?.email,
          attendance: `${attendance.present} out of ${attendance.total}`,

          schoolLogo: school?.logo,
          schoolMotto: school?.motto,
          schoolPhone: school?.phone,
          schoolEmail: school?.email,
          schoolAddress: school?.address,
          schoolGPS: (school?.settings as any)?.gpsAddress || "EN-075-3409",
          schoolPOBox: (school?.settings as any)?.poBox || "KF 222",

          class: studentClass?.name || "N/A",
          classCount: studentClass?.students?.length || 0,
          classTeacherName: studentClass?.classTeacher
            ? `${studentClass.classTeacher.profile?.firstName} ${studentClass.classTeacher.profile?.lastName}`
            : "N/A",
          classTeacherContact: studentClass?.classTeacher?.profile?.phone || "N/A",
          headmasterName:
            (school?.settings as any)?.headmasterName ||
            "AYEH ESSEL EDWINA OHENESI DR",
          classTeacherSignature: studentClass?.classTeacher?.profile?.userId
            ? teacherSigMap.get(studentClass.classTeacher.profile.userId) || null
            : null,
          headmasterSignature: headteacherSignatureUrl,
          headmasterRemark: res.headteacher ?? null,

          term: set.term.name,
          academicYear: set.academicYear.name,
          totalScore: res.totalMarks,
          average: res.averageMarks.toFixed(2),
          aggregate: res.aggregate,
          position: (res as any).position,
          outOf: (res as any).outOf,
          positionSuffix: getOrdinalSuffix((res as any).position),
          department: studentClass?.department?.name || "N/A",
          studentImage: studentInfo?.profile.user?.image,
          subjects: res.subjects,
          // Snapshot behavioral data if available
          // Use real remarks if available
          behavioral: {
            attitude: "N/A", // These specific sub-fields could be expanded later
            conduct: "N/A",
            interest: "N/A",
            remarks: res.behavioral ?? "No behavioral remarks recorded.",
            academic: res.academic ?? "No academic remarks recorded.",
            general: res.general ?? "No general remarks recorded.",
          },
          generatedAt: new Date().toISOString(),
        };

        return prisma.reportCard.upsert({
          where: { setId_studentId: { setId, studentId: res.studentId } },
          create: {
            setId,
            studentId: res.studentId,
            data: reportData,
          },
          update: {
            data: reportData,
          },
        });
      }),
      {
        timeout: 60000, // 60 seconds timeout to prevent interactive transaction timeouts on large batches
      }
    );

    // Update status to GENERATED
    await prisma.reportCardSet.update({
      where: { id: setId },
      data: { status: "GENERATED" },
    });

    revalidatePath(`/${schoolSlug}/admin/reports/report-cards`);
    revalidatePath(`/${schoolSlug}/admin/reports/report-cards/sets/${setId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REPORT_CARD_GENERATION_POST]", error);
    try {
      // Reset status back to DRAFT to prevent set from locking in GENERATING state
      await prisma.reportCardSet.update({
        where: { id: setId },
        data: { status: "DRAFT" },
      });
    } catch (dbErr) {
      console.error("Failed to reset set status on error:", dbErr);
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

function getOrdinalSuffix(i: number) {
  const j = i % 10,
    k = i % 100;
  if (j === 1 && k !== 11) {
    return "st";
  }
  if (j === 2 && k !== 12) {
    return "nd";
  }
  if (j === 3 && k !== 13) {
    return "rd";
  }
  return "th";
}
