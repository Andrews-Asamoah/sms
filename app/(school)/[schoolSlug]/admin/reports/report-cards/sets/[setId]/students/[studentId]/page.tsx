import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminReportCardClient } from "./client";

interface StudentReportPageProps {
  params: Promise<{ schoolSlug: string; setId: string; studentId: string }>;
}

export default async function StudentReportPage(props: StudentReportPageProps) {
  const params = await props.params;
  const { schoolSlug, setId, studentId } = params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  const report = await prisma.reportCard.findUnique({
    where: {
      setId_studentId: { setId, studentId },
    },
    include: {
      student: {
        include: {
          profile: true,
          class: true,
        },
      },
      set: {
        include: {
          academicYear: true,
          term: true,
          template: {
            include: { department: true },
          },
        },
      },
    },
  });

  if (!report) {
    redirect(`/${schoolSlug}/admin/reports/report-cards/sets/${setId}`);
  }

  // Fetch active term for this school to serve as a fallback
  const activeTerm = await prisma.term.findFirst({
    where: { academicYear: { schoolId: school.id } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const activeTermId = activeTerm?.id;

  // Find all sibling terms with the same name
  const siblingTerms = await prisma.term.findMany({
    where: {
      name: report.set.term.name,
      academicYear: { schoolId: school.id },
    },
    select: { id: true },
  });

  const termIds = Array.from(
    new Set(
      [
        report.set.termId,
        ...siblingTerms.map((t) => t.id),
        activeTermId,
      ].filter(Boolean) as string[]
    )
  );

  // Fetch all remarks for the student across these term candidates
  const allCandidateRemarks = await prisma.remark.findMany({
    where: {
      studentId,
      termId: { in: termIds },
    },
  });

  // Resolve and filter unique remarks based on precedence: Exact > Sibling > Active fallback
  const finalRemarksMap = new Map<string, any>();
  const remarkTypes = ["GENERAL", "BEHAVIORAL", "ACADEMIC", "HEADTEACHER", "ATTENDANCE", "ACHIEVEMENT", "CONCERN"];

  for (const type of remarkTypes) {
    // 1. Exact match
    const exact = allCandidateRemarks.find((r) => r.remarkType === type && r.termId === report.set.termId);
    if (exact) {
      finalRemarksMap.set(type, exact);
      continue;
    }
    // 2. Sibling match (excluding active fallback if different)
    const sibling = allCandidateRemarks.find((r) => r.remarkType === type && r.termId !== activeTermId);
    if (sibling) {
      finalRemarksMap.set(type, sibling);
      continue;
    }
    // 3. Active fallback match
    if (activeTermId) {
      const activeMatch = allCandidateRemarks.find((r) => r.remarkType === type && r.termId === activeTermId);
      if (activeMatch) {
        finalRemarksMap.set(type, activeMatch);
      }
    }
  }

  const remarks = Array.from(finalRemarksMap.values());

  // Fetch the school's default grading system for grade descriptions
  let gradingSystem = await prisma.gradingSystem.findFirst({
    where: { schoolId: school.id, isSchoolDefault: true },
    include: { gradeScales: { orderBy: { minScore: "desc" } } },
  });

  if (!gradingSystem) {
    gradingSystem = await prisma.gradingSystem.findFirst({
      where: { schoolId: school.id, isActive: true },
      include: { gradeScales: { orderBy: { minScore: "desc" } } },
    });
  }

  if (!gradingSystem) {
    gradingSystem = await prisma.gradingSystem.findFirst({
      where: { isSystemDefault: true },
      include: { gradeScales: { orderBy: { minScore: "desc" } } },
    });
  }

  // Calculate live attendance for the term
  // Fall back to what was stored at generation time if term dates are missing
  let attendanceStr = (report.data as any)?.attendance || null;
  try {
    const startDate = report.set.term.startDate;
    const endDate = report.set.term.endDate;

    if (startDate && endDate) {
      const endOfDay = new Date(new Date(endDate).setHours(23, 59, 59, 999));

      const [totalRecords, presentRecords] = await Promise.all([
        prisma.attendance.count({
          where: {
            studentId,
            date: { gte: startDate, lte: endOfDay },
          },
        }),
        prisma.attendance.count({
          where: {
            studentId,
            date: { gte: startDate, lte: endOfDay },
            status: { in: ["PRESENT", "LATE", "EXCUSED", "PERMISSION"] },
          },
        }),
      ]);

      if (totalRecords > 0) {
        attendanceStr = `${presentRecords} out of ${totalRecords}`;
      }
    }

    if (attendanceStr) {
      (report.data as any).attendance = attendanceStr;
    }
  } catch (err) {
    console.error("Failed to fetch live attendance", err);
  }

  // Pre-serialize all Prisma objects to safely pass them into the Client Component
  // This explicitly transforms any Prisma Decimal fields into basic primitive values
  const serializedReport = JSON.parse(JSON.stringify(report));
  const serializedSchool = JSON.parse(JSON.stringify(school));
  const serializedRemarks = JSON.parse(JSON.stringify(remarks));
  const serializedGradingSystem = JSON.parse(JSON.stringify(gradingSystem));
  

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 print:bg-transparent print:min-h-0">
      <AdminReportCardClient
        report={serializedReport}
        school={serializedSchool}
        schoolSlug={schoolSlug}
        remarks={serializedRemarks}
        gradingSystem={serializedGradingSystem}
      />
    </div>
  );
}
