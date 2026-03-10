import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import {
  Users,
  UserRound,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Calendar,
  Wallet,
  Activity,
} from "lucide-react";
import { getAdminDashboardStats } from "./actions";
import {
  EnrollmentTrendChart,
  FinancialSummaryChart,
  GenderDistributionChart,
} from "@/components/school/admin/admin-charts";
import { AnnouncementWidget } from "@/components/dashboard/announcement-widget";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description:
    "Advanced insight into school operations and academic performance",
};

interface AdminDashboardProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AdminDashboard({ params }: AdminDashboardProps) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const stats = await getAdminDashboardStats(schoolSlug);

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-primary/5 p-8 border border-primary/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {stats.schoolName}
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Overview for{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-primary/20 bg-background/50 backdrop-blur-sm"
            >
              <Activity className="mr-2 h-4 w-4" />
              System Status
            </Button>
            <Button className="rounded-xl shadow-lg shadow-primary/20">
              Quick Actions
            </Button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Primary KPI Ribbon */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Students",
            value: stats.counts.students,
            icon: GraduationCap,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
          {
            label: "Total Teachers",
            value: stats.counts.teachers,
            icon: UserRound,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
          },
          {
            label: "Staff Members",
            value: stats.counts.staff,
            icon: Users,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
          },
          {
            label: "Active Classes",
            value: stats.counts.classes,
            icon: BookOpen,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
        ].map((kpi, idx) => (
          <Card
            key={idx}
            className="group overflow-hidden rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md transition-all hover:shadow-lg hover:shadow-primary/5"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </p>
                  <h3 className="mt-2 text-3xl font-bold">{kpi.value}</h3>
                </div>
                <div
                  className={`rounded-xl p-3 ${kpi.bg} ${kpi.color} transition-transform group-hover:scale-110`}
                >
                  <kpi.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-muted-foreground">
                <TrendingUp className="mr-1 h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500 font-medium">+4%</span>
                <span className="ml-1">from last term</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analysis Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          <EnrollmentTrendChart data={stats.enrollmentTrends} />

          <div className="grid gap-6 md:grid-cols-2">
            <FinancialSummaryChart
              data={stats.financials.chartData}
              currency={stats.currency}
            />
            <GenderDistributionChart data={stats.genderDistribution} />
          </div>
        </div>

        {/* Sidebar Column: Recent Activity & Quick Links */}
        <div className="space-y-6">
          <AnnouncementWidget />
          <Card className="rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest system updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {stats.recentActivities.length > 0 ? (
                  stats.recentActivities.map((activity) => (
                    <div key={activity.id} className="relative flex gap-4">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold">
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {activity.description}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(activity.time).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 italic">
                    No recent activity found
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-6 text-primary hover:text-primary hover:bg-primary/5 rounded-xl"
              >
                View All Events
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-primary/5 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold">
                Financial Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground text-foreground">
                  Revenue vs Expenses
                </span>
                <Badge
                  variant="secondary"
                  className={`${
                    stats.financials.totalRevenue >= stats.financials.totalExpenses
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-red-500/10 text-red-500"
                  } border-none px-2 py-0`}
                >
                  {stats.financials.totalRevenue >= stats.financials.totalExpenses
                    ? "Healthy"
                    : "Deficit"}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span>Usage</span>
                  <span>
                    {stats.financials.totalRevenue > 0
                      ? Math.min(
                          Math.round(
                            (stats.financials.totalExpenses /
                              stats.financials.totalRevenue) *
                              100,
                          ),
                          100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${
                        stats.financials.totalRevenue > 0
                          ? Math.min(
                              (stats.financials.totalExpenses /
                                stats.financials.totalRevenue) *
                                100,
                              100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <Separator className="bg-primary/10" />
              <div className="pt-2">
                <Button className="w-full rounded-xl" size="sm" asChild>
                  <a href={`/${schoolSlug}/admin/finance`}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Financial Reports
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {session.isSuperAdmin && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-center gap-3 animate-pulse">
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          <p className="text-sm font-medium text-yellow-500/80">
            Viewing as Root Administrator
          </p>
        </div>
      )}
    </div>
  );
}
