import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
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

  // Fetch teacher/headmaster remarks for this student + term
  // Strategy: First look for remarks matching the report set's termId exactly.
  // If no GENERAL remark found, also look for any remark in the same academic period
  // (the teacher portal may have used a different term record with the same name).
  let remarks = await prisma.remark.findMany({
    where: { studentId, termId: report.set.termId },
  });

  // If no GENERAL remark found, try finding remarks for this student via the term name
  if (!remarks.find((r) => r.remarkType === "GENERAL")) {
    const termName = report.set.term.name;
    // Find all terms with the same name for this school
    const siblingTerms = await prisma.term.findMany({
      where: {
        name: termName,
        academicYear: { schoolId: school.id },
        id: { not: report.set.termId },
      },
      select: { id: true },
    });
    if (siblingTerms.length > 0) {
      const siblingRemarks = await prisma.remark.findMany({
        where: {
          studentId,
          termId: { in: siblingTerms.map((t) => t.id) },
          remarkType: { in: ["GENERAL", "BEHAVIORAL"] },
        },
      });
      // Merge: use sibling remarks for any type not already found in primary
      const foundTypes = new Set(remarks.map((r) => r.remarkType));
      for (const sr of siblingRemarks) {
        if (!foundTypes.has(sr.remarkType)) {
          remarks = [...remarks, sr];
          foundTypes.add(sr.remarkType);
        }
      }
    }
  }

  // Fetch the school's default grading system for grade descriptions
  const gradingSystem = await prisma.gradingSystem.findFirst({
    where: { schoolId: school.id, isSchoolDefault: true },
    include: { gradeScales: { orderBy: { minScore: "desc" } } },
  });

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
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link
              href={`/${schoolSlug}/admin/reports/report-cards/sets/${setId}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-lg font-bold">
              {report.student.profile.firstName}{" "}
              {report.student.profile.lastName}
            </h2>
            <p className="text-xs text-muted-foreground">
              {report.set.term.name} &bull; {report.set.academicYear.name}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 print:hidden"
          onClick={undefined} // handled client-side
          id="print-report-btn"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

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
