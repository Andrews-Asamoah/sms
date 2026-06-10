import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { Calendar, ChevronLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AttendanceReportClient } from "./client";

export const metadata: Metadata = {
  title: "Attendance Report",
  description: "Analyze student attendance patterns by class and date range.",
};

interface AttendanceReportPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AttendanceReportPage({
  params,
}: AttendanceReportPageProps) {
  const { schoolSlug } = await params;

  // ── Auth ─────────────────────────────────────────────────────────────────
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    role?.effectiveRole !== "headteacher" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, name: true },
  });
  if (!school) redirect("/");

  // ── Seed data for filters (server-fetched, no client round-trip) ──────────
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8 space-y-6 md:space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/8 via-background to-background border border-orange-500/10 px-5 sm:px-8 py-6 sm:py-8"
          id="attendance-report-header"
        >
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-orange-600 shrink-0" />
                <span className="text-[11px] font-bold text-orange-600 uppercase tracking-widest">
                  Reports
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Attendance Report
              </h1>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed max-w-lg">
                Track student attendance patterns, identify at-risk students, and export
                data for{" "}
                <span className="font-semibold text-foreground">{school.name}</span>.
              </p>
            </div>
            <div className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-border/60 hover:border-orange-400/40 h-9 text-xs sm:text-sm rounded-xl"
                id="back-to-reports-btn"
              >
                <Link href={`/${schoolSlug}/admin/reports`}>
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  All Reports
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Interactive Client Section ──────────────────────────────────── */}
        <AttendanceReportClient schoolSlug={schoolSlug} classes={classes} />

      </div>
    </div>
  );
}
