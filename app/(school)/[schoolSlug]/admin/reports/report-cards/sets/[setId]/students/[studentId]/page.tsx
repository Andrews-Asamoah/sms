import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ChevronLeft, Download, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StudentReportClient } from "./client";

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
        },
      },
      set: {
        include: {
          academicYear: true,
          term: true,
        },
      },
    },
  });

  if (!report) {
    redirect(`/${schoolSlug}/admin/reports/report-cards/sets/${setId}`);
  }

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link
              href={`/${schoolSlug}/admin/reports/report-cards/sets/${setId}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold">
              {report.student.profile.firstName}{" "}
              {report.student.profile.lastName}
            </h2>
            <p className="text-xs text-muted-foreground">Report Card Preview</p>
          </div>
        </div>
      </div>

      <StudentReportClient
        report={report}
        school={school}
        schoolSlug={schoolSlug}
      />
    </div>
  );
}
