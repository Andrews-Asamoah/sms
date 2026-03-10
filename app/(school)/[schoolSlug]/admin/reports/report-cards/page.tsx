import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ClipboardList, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReportCardSetDialog } from "@/components/school/reports/report-card-set-dialog";
import { ReportCardsClient } from "./client";

interface ReportCardsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function ReportCardsPage(props: ReportCardsPageProps) {
  const params = await props.params;
  const { schoolSlug } = params;

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
    select: { id: true },
  });

  if (!school) {
    redirect("/");
  }

  // Fetch report card sets, academic years, terms, classes, and templates
  const [reportCardSets, academicYears, terms, classes, templates] =
    await Promise.all([
      prisma.reportCardSet.findMany({
        where: { schoolId: school.id },
        include: {
          academicYear: { select: { name: true } },
          term: { select: { name: true } },
          class: { select: { name: true } },
          targetClasses: { include: { class: { select: { name: true } } } },
          _count: { select: { reportCards: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.academicYear.findMany({
        where: { schoolId: school.id },
        select: { id: true, name: true, isCurrent: true },
        orderBy: { name: "desc" },
      }),
      prisma.term.findMany({
        where: { academicYear: { schoolId: school.id } },
        select: { id: true, name: true, academicYearId: true },
      }),
      prisma.class.findMany({
        where: { schoolId: school.id, isActive: true },
        select: {
          id: true,
          name: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.reportCardTemplate.findMany({
        where: { schoolId: school.id, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-primary" />
              Report Cards
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate, manage, and publish student report cards
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link
                href={`/${schoolSlug}/admin/reports/report-cards/templates`}
              >
                <LayoutTemplate className="h-4 w-4 mr-2" />
                Manage Templates
              </Link>
            </Button>
            <ReportCardSetDialog
              schoolSlug={schoolSlug}
              academicYears={academicYears}
              terms={terms}
              classes={classes}
              templates={templates}
            />
          </div>
        </div>

        <ReportCardsClient
          initialData={reportCardSets}
          schoolSlug={schoolSlug}
        />
      </div>
    </div>
  );
}
