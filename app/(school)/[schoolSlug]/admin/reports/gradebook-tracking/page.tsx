import { requireSchoolAccess } from "@/lib/auth/guards";
import { getActiveSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradebookReviewButton } from "@/components/school/marks/gradebook-review-button";
import { formatStudentName } from "@/lib/utils/name-formatter";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  AlertCircle,
  TrendingUp,
  Users,
  LayoutGrid,
} from "lucide-react";

export const revalidate = 60; // ISR: re-render at most every 60s

interface GradebookTrackingPageProps {
  params: Promise<{ schoolSlug: string }>;
}

const STATUS_CONFIG = {
  FINAL:     { label: "Final",     color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400", bar: "bg-emerald-500",  icon: CheckCircle2 },
  REVIEWED:  { label: "Reviewed",  color: "bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-400",           bar: "bg-teal-500",     icon: CheckCircle2 },
  SUBMITTED: { label: "Submitted", color: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",           bar: "bg-blue-500",     icon: TrendingUp   },
  DRAFT:     { label: "Draft",     color: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",       bar: "bg-amber-400",    icon: Clock        },
} as const;

export default async function GradebookTrackingPage({ params }: GradebookTrackingPageProps) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  const effectiveRole = activeRole?.effectiveRole || "teacher";

  if (
    !["admin", "owner", "headteacher", "teacher"].includes(effectiveRole) &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // HOD check for teachers
  const hodDepartmentIds =
    effectiveRole === "teacher"
      ? (
          await prisma.department.findMany({
            where: { headOfDept: { profile: { userId: session.user.id } } },
            select: { id: true },
          })
        ).map((d) => d.id)
      : [];

  if (effectiveRole === "teacher" && hodDepartmentIds.length === 0) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // ── Cached data fetch ──────────────────────────────────────────────────────
  const getCachedPage = unstable_cache(
    async (slug: string, hodDeptIds: string[]) => {
      const school = await prisma.school.findUnique({
        where: { subdomain: slug },
        select: { id: true },
      });
      if (!school) return null;

      const currentTerm = await prisma.term.findFirst({
        where: { isCurrent: true, academicYear: { schoolId: school.id } },
        include: { academicYear: { select: { name: true } } },
      });
      if (!currentTerm) return { school, currentTerm: null, classStats: [], totalCompletion: 0 };

      const classes = await prisma.class.findMany({
        where: {
          schoolId: school.id,
          academicYearId: currentTerm.academicYearId,
          ...(hodDeptIds.length > 0 ? { departmentId: { in: hodDeptIds } } : {}),
        },
        include: {
          department: { select: { id: true, name: true } },
          subjects: {
            include: {
              subject: { select: { name: true } },
              teacher: { include: { profile: { select: { firstName: true, lastName: true, otherNames: true } } } },
            },
          },
          _count: { select: { students: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { name: "asc" },
      });

      const classIds = classes.map((c) => c.id);
      const subjectIds = Array.from(new Set(classes.flatMap((c) => c.subjects.map((s) => s.subjectId))));

      const scores = await prisma.assessmentScore.findMany({
        where: {
          termId: currentTerm.id,
          subjectId: { in: subjectIds },
          student: { classId: { in: classIds }, status: "ACTIVE" },
        },
        select: {
          status: true,
          subjectId: true,
          student: { select: { classId: true } },
        },
      });

      // Build class-subject stats map in-memory (no N+1)
      const statsMap = new Map<string, { completed: number; dominantStatus: string }>();
      const statusOrder = ["FINAL", "REVIEWED", "SUBMITTED", "DRAFT"];

      for (const score of scores) {
        if (!score.student) continue;
        const key = `${score.student.classId}-${score.subjectId}`;
        if (!statsMap.has(key)) statsMap.set(key, { completed: 0, dominantStatus: "DRAFT" });
        const val = statsMap.get(key)!;
        if (["SUBMITTED", "REVIEWED", "FINAL"].includes(score.status)) val.completed++;
        const currentIdx = statusOrder.indexOf(val.dominantStatus);
        const newIdx = statusOrder.indexOf(score.status);
        if (newIdx < currentIdx) val.dominantStatus = score.status; // promote to higher status
      }

      const classStats = classes.map((cls) => {
        const studentCount = cls._count.students;
        const subjectStats = cls.subjects.map((s) => {
          const key = `${cls.id}-${s.subjectId}`;
          const stat = statsMap.get(key) ?? { completed: 0, dominantStatus: "DRAFT" };
          const percentage = studentCount > 0 ? Math.round((stat.completed / studentCount) * 100) : 0;

          let teacherName = "Unassigned";
          if (s.teacher) {
            teacherName = s.teacher.profile
              ? formatStudentName(s.teacher.profile.firstName, s.teacher.profile.lastName, s.teacher.profile.otherNames ?? undefined)
              : formatStudentName(s.teacher.firstName ?? "", s.teacher.lastName ?? "") || "Invited Teacher";
          }

          // Initials for avatar
          const nameParts = teacherName.split(" ");
          const initials = nameParts.length >= 2
            ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
            : teacherName.slice(0, 2).toUpperCase();

          return {
            id: s.id,
            subjectId: s.subjectId,
            subjectName: s.subject.name,
            teacherName,
            initials,
            completed: stat.completed,
            total: studentCount,
            percentage,
            status: stat.dominantStatus as keyof typeof STATUS_CONFIG,
          };
        });

        const classPercentage = subjectStats.length > 0
          ? Math.round(subjectStats.reduce((a, b) => a + b.percentage, 0) / subjectStats.length)
          : 0;

        return {
          id: cls.id,
          name: cls.name,
          department: cls.department,
          studentCount,
          subjectStats,
          overallPercentage: classPercentage,
        };
      });

      const totalCompletion = classStats.length > 0
        ? Math.round(classStats.reduce((a, b) => a + b.overallPercentage, 0) / classStats.length)
        : 0;

      // Group by department
      const departmentMap = new Map<string, { id: string; name: string; classes: typeof classStats }>();
      for (const cls of classStats) {
        const deptId = cls.department?.id ?? "none";
        const deptName = cls.department?.name ?? "General";
        if (!departmentMap.has(deptId)) departmentMap.set(deptId, { id: deptId, name: deptName, classes: [] });
        departmentMap.get(deptId)!.classes.push(cls);
      }

      const departments = Array.from(departmentMap.values());

      return { school, currentTerm, classStats, totalCompletion, departments };
    },
    [`gradebook-page-${schoolSlug}-${hodDepartmentIds.sort().join("-")}`],
    { revalidate: 60 }
  );

  const data = await getCachedPage(schoolSlug, hodDepartmentIds);

  if (!data) redirect("/");

  if (!data.currentTerm) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center p-8">
        <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Clock className="h-10 w-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold">No Active Term</h2>
        <p className="text-muted-foreground max-w-sm">
          There is no current academic term set. Please configure an active term in{" "}
          <strong>Academic Years</strong> settings before tracking gradebook completion.
        </p>
        <Button variant="outline" asChild>
          <a href={`/${schoolSlug}/admin/academic`}>Go to Academic Settings</a>
        </Button>
      </div>
    );
  }

  const { currentTerm, classStats, totalCompletion, departments } = data;

  const totalSubjects = classStats.reduce((a, c) => a + c.subjectStats.length, 0);
  const submittedSubjects = classStats.reduce(
    (a, c) => a + c.subjectStats.filter((s) => ["SUBMITTED", "REVIEWED", "FINAL"].includes(s.status)).length,
    0
  );
  const finalSubjects = classStats.reduce(
    (a, c) => a + c.subjectStats.filter((s) => s.status === "FINAL" || s.status === "REVIEWED").length,
    0
  );

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, totalCompletion) / 100);

  return (
    <div className="space-y-8 pb-12 p-4 md:p-6">

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-6 md:p-8">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_top_left,white,transparent_70%)]" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-widest">Gradebook Tracking</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Completion Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {currentTerm.name} &mdash; {currentTerm.academicYear.name}
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4 mt-5">
              {[
                { label: "Classes", value: classStats.length, icon: LayoutGrid, color: "text-primary" },
                { label: "Subjects", value: totalSubjects, icon: BookOpen, color: "text-blue-500" },
                { label: "Submitted", value: submittedSubjects, icon: TrendingUp, color: "text-amber-500" },
                { label: "Finalized", value: finalSubjects, icon: CheckCircle2, color: "text-emerald-500" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 bg-background/60 backdrop-blur border border-border/50 rounded-xl px-4 py-2.5">
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                  <div>
                    <p className="text-xl font-black leading-none">{stat.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Radial Progress Ring */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative">
              <svg width="140" height="140" className="-rotate-90">
                <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
                <circle
                  cx="70" cy="70" r={radius} fill="none"
                  stroke="currentColor" strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className={cn(
                    "transition-all duration-700",
                    totalCompletion >= 100 ? "text-emerald-500" :
                    totalCompletion >= 70  ? "text-primary" :
                    totalCompletion >= 40  ? "text-amber-500" : "text-rose-500"
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black">{totalCompletion}%</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Overall</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">School Progress</p>
          </div>
        </div>
      </div>

      {/* ── No Classes State ─────────────────────────────────────────────────── */}
      {classStats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold">No Classes Found</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            No classes are configured for the current academic year, or no subjects have been assigned yet.
          </p>
        </div>
      )}

      {/* ── Department Groups ────────────────────────────────────────────────── */}
      {departments.map((dept) => {
        const deptAvg = dept.classes.length > 0
          ? Math.round(dept.classes.reduce((a, c) => a + c.overallPercentage, 0) / dept.classes.length)
          : 0;

        return (
          <div key={dept.id} className="space-y-4">
            {/* Department header */}
            {departments.length > 1 && (
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border/60" />
                <div className="flex items-center gap-2 bg-muted/50 border border-border/50 rounded-full px-4 py-1.5">
                  <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-bold text-foreground">{dept.name}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className={cn(
                    "text-sm font-bold",
                    deptAvg >= 80 ? "text-emerald-600" : deptAvg >= 50 ? "text-primary" : "text-amber-600"
                  )}>{deptAvg}% avg</span>
                </div>
                <div className="h-px flex-1 bg-border/60" />
              </div>
            )}

            {/* Class cards grid */}
            <div className="grid gap-5 lg:grid-cols-2">
              {dept.classes.map((cls) => {
                const allDone = cls.overallPercentage === 100;
                return (
                  <div
                    key={cls.id}
                    className={cn(
                      "group rounded-2xl border bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5",
                      allDone ? "border-emerald-500/30" : "border-border/60"
                    )}
                  >
                    {/* Card header */}
                    <div className={cn(
                      "px-5 py-4 border-b border-border/40",
                      allDone ? "bg-emerald-500/5" : "bg-muted/30"
                    )}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm",
                            allDone ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-primary/10 text-primary"
                          )}>
                            {cls.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-base leading-tight">{cls.name}</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Users className="h-3 w-3" />
                              {cls.studentCount} students · {cls.subjectStats.length} subjects
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className={cn(
                              "text-2xl font-black leading-none",
                              allDone ? "text-emerald-600" : cls.overallPercentage >= 70 ? "text-primary" : "text-amber-600"
                            )}>
                              {cls.overallPercentage}%
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">complete</p>
                          </div>
                          {allDone && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                        </div>
                      </div>

                      {/* Class-level progress bar */}
                      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700",
                            allDone ? "bg-emerald-500" : cls.overallPercentage >= 70 ? "bg-primary" : "bg-amber-400"
                          )}
                          style={{ width: `${cls.overallPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Subject rows */}
                    <div className="divide-y divide-border/40">
                      {cls.subjectStats.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground italic">
                          No subjects assigned
                        </div>
                      ) : (
                        cls.subjectStats.map((s) => {
                          const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.DRAFT;
                          const StatusIcon = cfg.icon;
                          return (
                            <div
                              key={s.id}
                              className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                            >
                              {/* Subject */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-semibold truncate">{s.subjectName}</span>
                                </div>
                                {/* Teacher */}
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[8px] font-bold shrink-0">
                                    {s.initials}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground truncate">{s.teacherName}</span>
                                </div>
                              </div>

                              {/* Status badge */}
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] font-bold px-2 py-0.5 gap-1 shrink-0", cfg.color)}
                              >
                                <StatusIcon className="h-2.5 w-2.5" />
                                {cfg.label}
                              </Badge>

                              {/* Mini progress + fraction */}
                              <div className="flex flex-col items-end gap-0.5 w-14 shrink-0">
                                <span className="text-xs font-bold">{s.percentage}%</span>
                                <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full transition-all duration-500", cfg.bar)}
                                    style={{ width: `${s.percentage}%` }}
                                  />
                                </div>
                                <span className="text-[9px] text-muted-foreground">{s.completed}/{s.total}</span>
                              </div>

                              {/* Review action */}
                              <div className="shrink-0 w-20 flex justify-end">
                                {s.status !== "DRAFT" ? (
                                  <GradebookReviewButton
                                    schoolSlug={schoolSlug}
                                    classId={cls.id}
                                    subjectId={s.subjectId}
                                    termId={currentTerm.id}
                                    subjectName={s.subjectName}
                                    className={cls.name}
                                  />
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/60 italic">Pending</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
