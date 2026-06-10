import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import {
  Users,
  GraduationCap,
  UserRound,
  TrendingUp,
  ChevronLeft,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Enrollment Strength Report",
  description: "View student enrollment numbers, class capacities, and demographic breakdowns.",
};

interface EnrollmentReportPageProps {
  params: Promise<{ schoolSlug: string }>;
}

// ─── Status badge helpers ────────────────────────────────────────────────────

type StudentStatus = "ACTIVE" | "INACTIVE" | "GRADUATED" | "SUSPENDED" | "EXPELLED";

const statusStyles: Record<StudentStatus, string> = {
  ACTIVE:    "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  INACTIVE:  "bg-gray-500/10   text-gray-500   border-gray-200",
  GRADUATED: "bg-blue-500/10   text-blue-600   border-blue-200",
  SUSPENDED: "bg-amber-500/10  text-amber-600  border-amber-200",
  EXPELLED:  "bg-red-500/10    text-red-600    border-red-200",
};

function StatusBadge({ status }: { status: StudentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status] ?? statusStyles.INACTIVE}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Capacity fill bar ───────────────────────────────────────────────────────

function FillBar({ active, capacity }: { active: number; capacity: number | null }) {
  if (capacity === null || capacity === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const pct = Math.min((active / capacity) * 100, 100);
  const barColor =
    pct > 95 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground tabular-nums w-9 shrink-0">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function EnrollmentReportPage({ params }: EnrollmentReportPageProps) {
  const { schoolSlug } = await params;

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

  // ── Parallel data fetch ──────────────────────────────────────────────────
  const [
    totalStudents,
    maleStudents,
    femaleStudents,
    activeClasses,
    recentAdmissions,
  ] = await Promise.all([
    // 1. Total active students
    prisma.student.count({
      where: { schoolId: school.id, status: "ACTIVE" },
    }),

    // 2. Active male students
    prisma.student.count({
      where: {
        schoolId: school.id,
        status: "ACTIVE",
        profile: { gender: "MALE" },
      },
    }),

    // 3. Active female students
    prisma.student.count({
      where: {
        schoolId: school.id,
        status: "ACTIVE",
        profile: { gender: "FEMALE" },
      },
    }),

    // 4. All active classes with student counts & teacher info
    prisma.class.findMany({
      where: { schoolId: school.id, isActive: true },
      select: {
        id: true,
        name: true,
        level: true,
        capacity: true,
        classTeacher: {
          select: {
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        _count: {
          select: { students: { where: { status: "ACTIVE" } } },
        },
      },
      orderBy: { name: "asc" },
    }),

    // 5. Last 10 recently admitted students
    prisma.student.findMany({
      where: { schoolId: school.id },
      select: {
        id: true,
        status: true,
        admissionDate: true,
        profile: { select: { firstName: true, lastName: true } },
        class: { select: { name: true } },
      },
      orderBy: { admissionDate: "desc" },
      take: 10,
    }),
  ]);

  // Serialize dates
  const serializedClasses = JSON.parse(JSON.stringify(activeClasses));
  const serializedAdmissions = JSON.parse(JSON.stringify(recentAdmissions));

  const totalClasses = serializedClasses.length;

  // ── KPI cards config ─────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Total Students",
      value: totalStudents,
      icon: GraduationCap,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
      id: "kpi-total-students",
    },
    {
      label: "Male Students",
      value: maleStudents,
      icon: UserRound,
      color: "text-indigo-600",
      bg: "bg-indigo-500/10",
      id: "kpi-male-students",
    },
    {
      label: "Female Students",
      value: femaleStudents,
      icon: Users,
      color: "text-pink-600",
      bg: "bg-pink-500/10",
      id: "kpi-female-students",
    },
    {
      label: "Total Classes",
      value: totalClasses,
      icon: BarChart3,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      id: "kpi-total-classes",
    },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8 space-y-6 md:space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-background to-background border border-primary/10 px-5 sm:px-8 py-6 sm:py-8"
          id="enrollment-report-header"
        >
          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              {/* Breadcrumb label */}
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-[11px] font-bold text-primary uppercase tracking-widest">
                  Reports
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Enrollment Strength
              </h1>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed max-w-lg">
                Student population, gender breakdown, class capacities, and recent
                admissions for <span className="font-semibold text-foreground">{school.name}</span>.
              </p>
            </div>

            {/* Back button */}
            <div className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-border/60 hover:border-primary/40 h-9 text-xs sm:text-sm rounded-xl"
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

        {/* ── KPI Stat Cards ───────────────────────────────────────────────── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" id="enrollment-kpi-cards">
          {kpis.map((kpi) => (
            <Card
              key={kpi.id}
              id={kpi.id}
              className="group overflow-hidden rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md transition-all hover:shadow-lg hover:shadow-primary/5"
            >
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      {kpi.label}
                    </p>
                    <h3 className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums">
                      {kpi.value.toLocaleString()}
                    </h3>
                  </div>
                  <div
                    className={`rounded-xl p-2.5 sm:p-3 ${kpi.bg} ${kpi.color} transition-transform group-hover:scale-110`}
                  >
                    <kpi.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Class Enrollment Table ───────────────────────────────────────── */}
        <Card
          className="rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md"
          id="class-enrollment-table-card"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-bold">Class Enrollment</CardTitle>
            </div>
            <CardDescription>
              Active students per class and capacity utilisation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px]" id="class-enrollment-table">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Class Name
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Class Teacher
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Active Students
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Capacity
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Fill %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {serializedClasses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-sm text-muted-foreground italic"
                      >
                        No active classes found.
                      </td>
                    </tr>
                  ) : (
                    serializedClasses.map(
                      (cls: {
                        id: string;
                        name: string;
                        level: string | null;
                        capacity: number | null;
                        classTeacher: { profile: { firstName: string; lastName: string } } | null;
                        _count: { students: number };
                      }) => {
                        const teacherName = cls.classTeacher?.profile
                          ? `${cls.classTeacher.profile.firstName} ${cls.classTeacher.profile.lastName}`
                          : "—";
                        const activeCount = cls._count.students;

                        return (
                          <tr
                            key={cls.id}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 sm:px-6 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">
                                  {cls.name}
                                </span>
                                {cls.level && (
                                  <span className="text-xs text-muted-foreground mt-0.5">
                                    {cls.level}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3.5 text-sm text-muted-foreground">
                              {teacherName}
                            </td>
                            <td className="px-4 sm:px-6 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center h-7 w-10 rounded-lg bg-primary/5 text-sm font-bold tabular-nums">
                                {activeCount}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3.5 text-center text-sm font-mono text-muted-foreground tabular-nums">
                              {cls.capacity ?? "—"}
                            </td>
                            <td className="px-4 sm:px-6 py-3.5">
                              <FillBar
                                active={activeCount}
                                capacity={cls.capacity}
                              />
                            </td>
                          </tr>
                        );
                      }
                    )
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Recent Admissions ────────────────────────────────────────────── */}
        <Card
          className="rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md"
          id="recent-admissions-card"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-bold">Recent Admissions</CardTitle>
            </div>
            <CardDescription>Last 10 students admitted to the school</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table
                className="w-full min-w-[480px]"
                id="recent-admissions-table"
              >
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Student Name
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Class
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Admission Date
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {serializedAdmissions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-10 text-center text-sm text-muted-foreground italic"
                      >
                        No admissions found.
                      </td>
                    </tr>
                  ) : (
                    serializedAdmissions.map(
                      (student: {
                        id: string;
                        status: StudentStatus;
                        admissionDate: string | null;
                        profile: { firstName: string; lastName: string } | null;
                        class: { name: string } | null;
                      }) => {
                        const fullName = student.profile
                          ? `${student.profile.firstName} ${student.profile.lastName}`
                          : "Unknown Student";

                        const admissionFormatted = student.admissionDate
                          ? new Date(student.admissionDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—";

                        return (
                          <tr
                            key={student.id}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 sm:px-6 py-3.5 font-medium text-sm">
                              {fullName}
                            </td>
                            <td className="px-4 sm:px-6 py-3.5 text-sm text-muted-foreground">
                              {student.class?.name ?? "—"}
                            </td>
                            <td className="px-4 sm:px-6 py-3.5 text-sm font-mono text-muted-foreground tabular-nums">
                              {admissionFormatted}
                            </td>
                            <td className="px-4 sm:px-6 py-3.5">
                              <StatusBadge status={student.status} />
                            </td>
                          </tr>
                        );
                      }
                    )
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
