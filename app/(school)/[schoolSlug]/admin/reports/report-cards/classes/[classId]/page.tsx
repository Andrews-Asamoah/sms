import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  ArrowLeft,
  Download,
  Printer,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClassReportsClient } from "./client";

interface ClassReportsPageProps {
  params: Promise<{ schoolSlug: string; classId: string }>;
  searchParams: Promise<{ setId?: string }>;
}

export default async function ClassReportsPage(props: ClassReportsPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { schoolSlug, classId } = params;
  const { setId } = searchParams;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher" &&
    role?.effectiveRole !== "teacher" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    redirect("/");
  }

  // Fetch the specific class and its report card sets
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      reportCardSets: {
        where: { id: setId },
        include: {
          academicYear: true,
          term: true,
          reportCards: {
            include: {
              student: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!classData || (setId && classData.reportCardSets.length === 0)) {
    redirect(`/${schoolSlug}/admin/reports/report-cards`);
  }

  const currentSet = setId ? classData.reportCardSets[0] : null;

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/${schoolSlug}/admin/reports/report-cards`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <ClipboardList className="h-8 w-8 text-primary" />
                {classData.name} Results
              </h1>
              <p className="text-muted-foreground mt-1">
                {currentSet
                  ? `${currentSet.academicYear.name} • ${currentSet.term.name}`
                  : "Summary of academic performance"}
              </p>
            </div>
          </div>
          {currentSet && (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate All
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print All
              </Button>
            </div>
          )}
        </div>

        {!currentSet ? (
          <Card className="bg-background/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>No Set Selected</CardTitle>
              <CardDescription className="max-w-sm mt-2">
                Please select a report card set from the dashboard to view
                results.
              </CardDescription>
              <Button className="mt-6" asChild>
                <Link href={`/${schoolSlug}/admin/reports/report-cards`}>
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ClassReportsClient
            classData={classData}
            reportCardSet={currentSet}
            schoolSlug={schoolSlug}
          />
        )}
      </div>
    </div>
  );
}
