import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  LayoutTemplate,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReportCardSetDialog } from "@/components/school/reports/report-card-set-dialog";
import { ReportCardsClient } from "./client";
import { cn } from "@/lib/utils";

interface ReportCardsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function ReportCardsPage(props: ReportCardsPageProps) {
  const { schoolSlug } = await props.params;

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

  if (!school) redirect("/");

  const [reportCardSets, academicYears, terms, classes, templates] =
    await Promise.all([
      prisma.reportCardSet.findMany({
        where: { schoolId: school.id },
        include: {
          academicYear: { select: { name: true } },
          term: { select: { name: true } },
          class: { select: { name: true } },
          targetClasses: { include: { class: { select: { id: true, name: true } } } },
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

  // Compute summary stats
  const published = reportCardSets.filter((s) => s.status === "PUBLISHED").length;
  const generated = reportCardSets.filter((s) => s.status === "GENERATED").length;
  const drafts = reportCardSets.filter((s) => s.status === "DRAFT").length;
  const totalStudents = reportCardSets.reduce((a, s) => a + s._count.reportCards, 0);

  const stats = [
    { label: "Total Sets",  value: reportCardSets.length, icon: ClipboardList, color: "text-primary",      bg: "bg-primary/10" },
    { label: "Published",   value: published,              icon: CheckCircle2,  color: "text-emerald-600",  bg: "bg-emerald-500/10" },
    { label: "Generated",   value: generated,              icon: FileText,      color: "text-blue-600",     bg: "bg-blue-500/10" },
    { label: "Drafts",      value: drafts,                 icon: Clock,         color: "text-amber-600",    bg: "bg-amber-500/10" },
    { label: "Report Cards", value: totalStudents,         icon: Users,         color: "text-violet-600",   bg: "bg-violet-500/10" },
  ];

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-background to-background border border-primary/10 px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Reports</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight">Report Cards</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Generate, manage, and publish student report cards for each term
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" asChild className="border-border/60 hover:border-primary/40">
                <Link href={`/${schoolSlug}/admin/reports/report-cards/templates`}>
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Templates
                </Link>
              </Button>
              <Button variant="outline" asChild className="border-border/60 hover:border-primary/40">
                <Link href={`/${schoolSlug}/admin/reports/gradebook-tracking`}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Gradebook
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

          {/* Summary stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 bg-background/70 backdrop-blur border border-border/50 rounded-xl px-4 py-3"
              >
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", s.bg)}>
                  <s.icon className={cn("h-4.5 w-4.5", s.color)} />
                </div>
                <div>
                  <p className="text-xl font-black leading-none">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Report Card Sets Client ─────────────────────────────────────── */}
        <ReportCardsClient
          initialData={reportCardSets}
          schoolSlug={schoolSlug}
          academicYears={academicYears}
          terms={terms}
          classes={classes}
        />
      </div>
    </div>
  );
}
