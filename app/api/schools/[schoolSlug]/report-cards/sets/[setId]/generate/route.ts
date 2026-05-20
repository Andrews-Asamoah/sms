import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { formatStudentName } from "@/lib/utils/name-formatter";
import { verifyApiSchoolAccess } from "@/lib/auth/guards";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ schoolSlug: string; setId: string }> },
) {
  try {
    const { schoolSlug, setId } = await params;
    const access = await verifyApiSchoolAccess(schoolSlug, ["owner", "admin", "headteacher", "teacher"]);
    if (!access.authorized) return access.errorResponse;
    const { session } = access;


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

    // Determine all target class IDs
    const classIds = set.classId ? [set.classId] : set.targetClasses.map(tc => tc.classId);

    // Build a map of classes by ID for quick lookup during generation
    const classMap = new Map<string, any>();
    if (set.class) {
      classMap.set(set.class.id, set.class);
    }
    set.targetClasses.forEach(tc => {
      classMap.set(tc.classId, tc.class);
    });

    if (classIds.length === 0) {
      return new NextResponse("Report card set has no target classes", { status: 400 });
    }

    // 1. Fetch all students in the selected classes
    const students = await prisma.student.findMany({
      where: { classId: { in: classIds }, schoolId: set.schoolId, status: "ACTIVE" },
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

    // 2b. Fetch attendance and remarks for these students in this term
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
          termId: set.termId,
        },
      }),
    ]);

    // Pre-calculate total school days per class (unique dates marked for each class)
    const classTotalDaysMap = new Map<string, number>();
    classIds.forEach(cid => {
      const classStudentIds = students.filter(s => s.classId === cid).map(s => s.id);
      const uniqueDates = new Set(
        attendanceRecords
          .filter(a => classStudentIds.includes(a.studentId))
          .map(a => a.date.toISOString().split('T')[0])
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

        return {
          subjectId: score.subjectId,
          subjectName: score.subject.name,
          subjectCode: score.subject.code,
          classWorkScore: Number(classWorkScore),
          examScore: Number(examScore),
          totalScore: Number(score.totalScore),
          percentage: Number(score.percentage),
          grade: score.grade || "N/A",
          gradeValue: parseInt(score.grade || "9") || 9, // For aggregation
          remarks: score.remarks,
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

      // Get relevant remarks
      const bRemark = studentRemarks.find(r => r.studentId === student.id && r.remarkType === "BEHAVIORAL")?.content;
      const aRemark = studentRemarks.find(r => r.studentId === student.id && r.remarkType === "ACADEMIC")?.content;
      const gRemark = studentRemarks.find(r => r.studentId === student.id && r.remarkType === "GENERAL")?.content;

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
      };
    });

    // 4. Calculate Ranks (Positions)
    const rankedResults = [...studentResults].sort(
      (a, b) => b.totalMarks - a.totalMarks,
    );

    // Assign positions (handling ties)
    let currentRank = 0;
    let lastScore = -1;
    rankedResults.forEach((res, index) => {
      if (res.totalMarks !== lastScore) {
        currentRank = index + 1;
      }
      (res as any).position = currentRank;
      lastScore = res.totalMarks;
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

          term: set.term.name,
          academicYear: set.academicYear.name,
          totalScore: res.totalMarks,
          average: res.averageMarks.toFixed(2),
          aggregate: res.aggregate,
          position: (res as any).position,
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
    );

    // Update status to GENERATED
    await prisma.reportCardSet.update({
      where: { id: setId },
      data: { status: "GENERATED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REPORT_CARD_GENERATION_POST]", error);
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
