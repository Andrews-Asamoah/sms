import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  BookOpen,
  Award,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassBreakdownEntry {
  classId: string;
  className: string;
  avgScore: number;
  count: number;
}

interface SubjectStat {
  id: string;
  name: string;
  code: string | null;
  avgScore: number;
  count: number;
  classBreakdown: ClassBreakdownEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGradeBand(score: number): {
  label: string;
  variant: string;
  className: string;
} {
  if (score >= 80)
    return {
      label: "A",
      variant: "outline",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };
  if (score >= 70)
    return {
      label: "B",
      variant: "outline",
      className:
        "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    };
  if (score >= 55)
    return {
      label: "C",
      variant: "outline",
      className:
        "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    };
  if (score >= 45)
    return {
      label: "D",
      variant: "outline",
      className:
        "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
    };
  return {
    label: "F",
    variant: "outline",
    className:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  };
}

function getBarColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-400";
  return "bg-red-500";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SubjectPerformancePage(props: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await props.params;

  // Auth
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

  // Fetch school
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, name: true },
  });

  if (!school) redirect("/");

  // ── Data fetching ────────────────────────────────────────────────────────

  // 1. All active subjects
  const subjects = await prisma.subject.findMany({
    where: { schoolId: school.id, isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  // 2. Aggregate scores by subject (avg + count)
  //    FINAL is the terminal status; isLocked covers additionally locked records
  const subjectScoreAgg = await prisma.assessmentScore.groupBy({
    by: ["subjectId"],
    where: {
      subject: { schoolId: school.id },
      OR: [
        { status: "FINAL" },
        { isLocked: true },
      ],
    },
    _avg: { percentage: true },
    _count: { id: true },
  });

  // Build a quick lookup map: subjectId → { avg, count }
  const scoreMap = new Map(
    subjectScoreAgg.map((s) => [
      s.subjectId,
      {
        avg: s._avg.percentage !== null ? Number(s._avg.percentage) : null,
        count: s._count.id,
      },
    ])
  );

  // 3. All active classes (for display)
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const classNameMap = new Map(classes.map((c) => [c.id, c.name]));

  // 4. Class breakdown — fetch raw scores with studentId, then join to class
  //    Only for subjects that have scores (avoid loading everything)
  const subjectIdsWithScores = subjectScoreAgg.map((s) => s.subjectId);

  const rawScores =
    subjectIdsWithScores.length > 0
      ? await prisma.assessmentScore.findMany({
          where: {
            subjectId: { in: subjectIdsWithScores },
            OR: [
              { status: "FINAL" },
              { isLocked: true },
            ],
            student: { schoolId: school.id },
          },
          select: {
            subjectId: true,
            percentage: true,
            student: { select: { classId: true } },
          },
        })
      : [];

  // Group raw scores by subjectId → classId → [percentages]
  const subjectClassMap = new Map<string, Map<string, number[]>>();
  for (const score of rawScores) {
    const classId = score.student?.classId;
    if (!classId) continue;
    if (!subjectClassMap.has(score.subjectId)) {
      subjectClassMap.set(score.subjectId, new Map());
    }
    const clsMap = subjectClassMap.get(score.subjectId)!;
    if (!clsMap.has(classId)) clsMap.set(classId, []);
    clsMap.get(classId)!.push(Number(score.percentage));
  }

  // ── Build subject stats ──────────────────────────────────────────────────

  const subjectStats: SubjectStat[] = subjects
    .map((subject) => {
      const agg = scoreMap.get(subject.id);
      const avgScore =
        agg?.avg !== null && agg?.avg !== undefined
          ? Math.round(agg.avg * 10) / 10
          : 0;
      const count = agg?.count ?? 0;

      // Class breakdown
      const classScoreMap = subjectClassMap.get(subject.id);
      const classBreakdown: ClassBreakdownEntry[] = [];

      if (classScoreMap) {
        for (const [classId, percentages] of classScoreMap.entries()) {
          const avg =
            percentages.reduce((a, b) => a + b, 0) / percentages.length;
          classBreakdown.push({
            classId,
            className: classNameMap.get(classId) ?? "Unknown Class",
            avgScore: Math.round(avg * 10) / 10,
            count: percentages.length,
          });
        }
        // Sort by avg descending
        classBreakdown.sort((a, b) => b.avgScore - a.avgScore);
      }

      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        avgScore,
        count,
        classBreakdown,
      };
    })
    .filter((s) => s.count > 0) // only show subjects with final/locked scores
    .sort((a, b) => b.avgScore - a.avgScore);

  // ── KPI computations ─────────────────────────────────────────────────────

  const totalScores = subjectStats.reduce((a, s) => a + s.count, 0);
  const overallAvg =
    subjectStats.length > 0
      ? Math.round(
          (subjectStats.reduce((a, s) => a + s.avgScore * s.count, 0) /
            totalScores) *
            10
        ) / 10
      : 0;
  const topSubject = subjectStats[0] ?? null;
  const lowestSubject =
    subjectStats.length > 1 ? subjectStats[subjectStats.length - 1] : null;

  // Top 3 subjects for class breakdown section
  const top3 = subjectStats.slice(0, 3);

  const hasData = subjectStats.length > 0;

  return (
    <div className="space-y-8 pb-12 p-4 md:p-6">
      {/* ── Back Button ─────────────────────────────────────────────────────── */}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/${schoolSlug}/admin/reports`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Reports
          </Link>
        </Button>
      </div>

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-6 md:p-8">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_top_left,white,transparent_70%)]" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-widest">
                Academic Reports
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              Subject Performance
            </h1>
            <p className="text-muted-foreground mt-1 max-w-lg">
              Analyze average grades and student performance across all subjects.
              Only finalized and locked assessment scores are included.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-background/60 backdrop-blur border border-border/50 rounded-xl px-5 py-3 shrink-0">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-black leading-none">
                {subjectStats.length}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Subjects Assessed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Overall Average */}
        <Card className="rounded-2xl bg-card/50 backdrop-blur-md border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              School Average
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black">
              {hasData ? `${overallAvg}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Across all subjects
            </p>
          </CardContent>
        </Card>

        {/* Top Subject */}
        <Card className="rounded-2xl bg-card/50 backdrop-blur-md border-emerald-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Subject
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {topSubject ? `${topSubject.avgScore}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {topSubject ? topSubject.name : "No data yet"}
            </p>
          </CardContent>
        </Card>

        {/* Lowest Subject */}
        <Card className="rounded-2xl bg-card/50 backdrop-blur-md border-red-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs Attention
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-red-600 dark:text-red-400">
              {lowestSubject ? `${lowestSubject.avgScore}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {lowestSubject ? lowestSubject.name : "No data yet"}
            </p>
          </CardContent>
        </Card>

        {/* Total Scores */}
        <Card className="rounded-2xl bg-card/50 backdrop-blur-md border-blue-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Scores
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Award className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black">{totalScores}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Finalized assessments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Empty State ─────────────────────────────────────────────────────── */}
      {!hasData && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold">No Assessment Data Yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            There are no finalized or locked assessment scores for this school.
            Scores will appear here once teachers finalize their gradebooks.
          </p>
          <Button variant="outline" asChild>
            <Link href={`/${schoolSlug}/admin/reports/gradebook-tracking`}>
              Check Gradebook Status
            </Link>
          </Button>
        </div>
      )}

      {/* ── Subject Performance Table ────────────────────────────────────────── */}
      {hasData && (
        <Card className="rounded-2xl bg-card/50 backdrop-blur-md overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Subject Breakdown</CardTitle>
                <CardDescription className="mt-0.5">
                  Sorted by average score (highest first)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Horizontally scrollable on mobile */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/10">
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">
                      Subject
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3">
                      Code
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3">
                      Avg Score
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3">
                      Grade Band
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3">
                      Students
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 w-48">
                      Performance Bar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {subjectStats.map((subject, idx) => {
                    const band = getGradeBand(subject.avgScore);
                    const barColor = getBarColor(subject.avgScore);
                    return (
                      <tr
                        key={subject.id}
                        className="hover:bg-muted/20 transition-colors group"
                      >
                        {/* Subject Name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-semibold text-sm truncate">
                                {subject.name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Code */}
                        <td className="px-4 py-4">
                          <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded">
                            {subject.code ?? "—"}
                          </span>
                        </td>

                        {/* Avg Score */}
                        <td className="px-4 py-4">
                          <span
                            className={`text-lg font-black ${
                              subject.avgScore >= 70
                                ? "text-emerald-600 dark:text-emerald-400"
                                : subject.avgScore >= 50
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {subject.avgScore}%
                          </span>
                        </td>

                        {/* Grade Band */}
                        <td className="px-4 py-4">
                          <Badge
                            variant="outline"
                            className={`font-bold text-xs px-2.5 py-0.5 ${band.className}`}
                          >
                            {band.label}
                          </Badge>
                        </td>

                        {/* Students Assessed */}
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium">
                            {subject.count}
                          </span>
                        </td>

                        {/* Bar Visualization */}
                        <td className="px-4 py-4 w-48">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                                style={{
                                  width: `${Math.min(subject.avgScore, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right shrink-0">
                              {subject.avgScore}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Class Breakdown for Top 3 Subjects ─────────────────────────────── */}
      {hasData && top3.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black tracking-tight">
              Class Breakdown — Top Subjects
            </h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            Which classes performed best in each top-performing subject
          </p>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {top3.map((subject, idx) => {
              const band = getGradeBand(subject.avgScore);
              return (
                <Card
                  key={subject.id}
                  className="rounded-2xl bg-card/50 backdrop-blur-md border-border/60 overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                >
                  {/* Card Header */}
                  <CardHeader className="bg-muted/20 border-b border-border/40 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="h-5 w-5 rounded bg-primary/15 flex items-center justify-center text-[10px] font-black text-primary shrink-0">
                            #{idx + 1}
                          </div>
                          <CardTitle className="text-base truncate">
                            {subject.name}
                          </CardTitle>
                        </div>
                        <CardDescription>
                          {subject.count} scores · Avg{" "}
                          <span className="font-semibold text-foreground">
                            {subject.avgScore}%
                          </span>
                        </CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className={`font-bold text-xs shrink-0 ${band.className}`}
                      >
                        {band.label}
                      </Badge>
                    </div>
                  </CardHeader>

                  {/* Class Rows */}
                  <CardContent className="p-0">
                    {subject.classBreakdown.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground italic">
                        No class breakdown available
                      </div>
                    ) : (
                      <div className="divide-y divide-border/30">
                        {subject.classBreakdown.slice(0, 5).map((cls, ci) => {
                          const clsBar = getBarColor(cls.avgScore);
                          return (
                            <div
                              key={cls.classId}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                            >
                              {/* Rank badge */}
                              <span
                                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                  ci === 0
                                    ? "bg-amber-400/20 text-amber-600"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {ci + 1}
                              </span>

                              {/* Class name */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {cls.className}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {cls.count} student
                                  {cls.count !== 1 ? "s" : ""}
                                </p>
                              </div>

                              {/* Score + bar */}
                              <div className="flex flex-col items-end gap-1 w-20 shrink-0">
                                <span
                                  className={`text-sm font-black ${
                                    cls.avgScore >= 70
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : cls.avgScore >= 50
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {cls.avgScore}%
                                </span>
                                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${clsBar}`}
                                    style={{
                                      width: `${Math.min(cls.avgScore, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
