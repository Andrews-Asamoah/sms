import { requireSchoolAccess } from "@/lib/auth/guards";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { GuardianReportCardView } from "./client";

interface GuardianReportDetailPageProps {
  params: Promise<{ schoolSlug: string; studentId: string; setId: string }>;
}

export default async function GuardianReportDetailPage({
  params,
}: GuardianReportDetailPageProps) {
  const { schoolSlug, studentId, setId } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });
  if (!school) redirect("/");

  // Verify guardian owns this student
  const guardian = await prisma.guardian.findFirst({
    where: {
      schoolId: school.id,
      profile: { userId: session.user.id },
      students: { some: { studentId } },
    },
  });

  if (!guardian) redirect(`/${schoolSlug}/unauthorized`);

  const report = await prisma.reportCard.findUnique({
    where: { setId_studentId: { setId, studentId } },
    include: {
      student: { include: { profile: true, class: true } },
      set: {
        include: {
          academicYear: true,
          term: true,
          template: { include: { department: true } },
        },
      },
    },
  });

  if (!report || !report.publishedAt) notFound();

  // Fetch remarks for this student + term
  const remarks = await prisma.remark.findMany({
    where: { studentId, termId: report.set.termId },
  });

  // Fetch default grading system for the school
  const gradingSystem = await prisma.gradingSystem.findFirst({
    where: { schoolId: school.id, isSchoolDefault: true },
    include: { gradeScales: { orderBy: { minScore: "desc" } } },
  });

  // Calculate live attendance for the term
  let attendanceStr = (report.data as any)?.attendance || null;
  try {
    const termLength = await prisma.attendance.count({
      where: {
        studentId,
        date: {
          gte: report.set.term.startDate,
          lte: report.set.term.endDate,
        },
        status: { in: ["PRESENT", "ABSENT", "LATE", "EXCUSED"] },
      },
    });

    const presentCount = await prisma.attendance.count({
      where: {
        studentId,
        date: {
          gte: report.set.term.startDate,
          lte: report.set.term.endDate,
        },
        status: { in: ["PRESENT", "LATE", "EXCUSED"] },
      },
    });

    if (termLength > 0) {
      attendanceStr = `${presentCount} out of ${termLength}`;
      (report.data as any).attendance = attendanceStr;
    }
  } catch (err) {
    console.error("Failed to fetch live attendance", err);
  }

  const serializedReport = JSON.parse(JSON.stringify(report));
  const serializedSchool = JSON.parse(JSON.stringify(school));
  const serializedRemarks = JSON.parse(JSON.stringify(remarks));
  const serializedGradingSystem = JSON.parse(JSON.stringify(gradingSystem));

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header bar */}
      <div className="flex items-center gap-3 p-4 bg-white border-b shadow-sm print:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${schoolSlug}/guardian/reports`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-base font-bold">
            {report.student.profile.firstName} {report.student.profile.lastName}{" "}
            — {report.set.term.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {report.set.academicYear.name}
          </p>
        </div>
      </div>

      <GuardianReportCardView
        report={serializedReport}
        school={serializedSchool}
        remarks={serializedRemarks}
        gradingSystem={serializedGradingSystem}
      />
    </div>
  );
}
