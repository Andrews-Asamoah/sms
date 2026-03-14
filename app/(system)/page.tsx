// ============================================
// SUPERADMIN DASHBOARD PAGE
// app/(system)/page.tsx
// ============================================
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { getSuperAdminDashboardData } from "@/lib/system/dashboard";
import { 
  Users, 
  School, 
  GraduationCap, 
  DollarSign, 
  ChevronRight,
  PlusCircle,
  Building2,
  ShieldCheck,
  Zap
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductTour } from "@/components/shared/product-tour";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getAuthSession();
  const { stats, recentActivity } = await getSuperAdminDashboardData();

  const firstName = session?.user?.name.split(" ")[0] || "Admin";

  const statCards = [
    {
      title: "Active Users",
      value: stats.users.toLocaleString(),
      description: "Total accounts registered",
      icon: Users,
    },
    {
      title: "Revenue",
      value: new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
      }).format(stats.revenue),
      description: "Total subscription payments",
      icon: DollarSign,
    },
    {
      title: "Active Schools",
      value: stats.schools.toLocaleString(),
      description: "Registered organizations",
      icon: School,
    },
    {
      title: "Total Students",
      value: stats.students.toLocaleString(),
      description: "Across all institutions",
      icon: GraduationCap,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-2 sm:p-0">
      {/* Page Header */}
      <div className="flex flex-col gap-2" id="header-welcome">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Welcome back, {firstName}!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
          Here&apos;s a live overview of your school management platform and global metrics.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" id="stats-grid">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stat.value}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 ">
        <Card className="col-span-4 border-slate-200/60 dark:border-slate-800/60" id="recent-activity">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system-wide audit logs</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-slate-900 transition-colors">
               <Link href="/analytics">
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
               </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivity.length > 0 ? (
                recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-4">
                    <div className="mt-1 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Zap className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold leading-none text-slate-900 dark:text-white">
                        {log.userName}
                      </p>
                      <p className="text-sm text-slate-500">
                        {log.action}d {log.entityType.toLowerCase().replace('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">
                    No recent activity found.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50" id="quick-actions">
          <CardHeader>
            <CardTitle>Global Quick Actions</CardTitle>
            <CardDescription>Common administrative operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Button asChild className="w-full justify-start gap-3 h-11 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold shadow-sm" variant="outline">
                <Link href="/schools/new">
                  <PlusCircle className="h-4 w-4 text-blue-500" />
                  Register New School
                </Link>
              </Button>
              <Button asChild className="w-full justify-start gap-3 h-11 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold shadow-sm" variant="outline">
                <Link href="/users">
                  <Users className="h-4 w-4 text-purple-500" />
                  Manage User Accounts
                </Link>
              </Button>
              <Button asChild className="w-full justify-start gap-3 h-11 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold shadow-sm" variant="outline">
                <Link href="/schools">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  Institution Registry
                </Link>
              </Button>
              <Button asChild className="w-full justify-start gap-3 h-11 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold shadow-sm" variant="outline">
                <Link href="/settings">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  Global System Settings
                </Link>
              </Button>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg overflow-hidden relative">
              <Zap className="absolute -right-2 -bottom-2 h-20 w-20 text-white/10 rotate-12" />
              <h4 className="font-bold text-lg mb-1 relative z-10">System Status</h4>
              <p className="text-white/80 text-sm mb-4 relative z-10 font-medium">All services are currently operational.</p>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 w-fit">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProductTour
        tourId="superadmin-dashboard"
        steps={[
          {
            element: "#header-welcome",
            popover: {
              title: "Welcome to SchoolMS!",
              description: "This is your control center for managing the entire platform.",
              side: "bottom",
              align: "start"
            }
          },
          {
            element: "#stats-grid",
            popover: {
              title: "Platform Metrics",
              description: "Monitor global stats like active users, schools, and total revenue at a glance.",
              side: "bottom",
              align: "start"
            }
          },
          {
            element: "#recent-activity",
            popover: {
              title: "System Logs",
              description: "Track all recent administrative actions across all institutions here.",
              side: "right",
              align: "start"
            }
          },
          {
            element: "#quick-actions",
            popover: {
              title: "Administrative Tools",
              description: "Quickly register new schools or manage user accounts globally.",
              side: "left",
              align: "start"
            }
          },
          {
            element: "#app-sidebar",
            popover: {
              title: "Main Navigation",
              description: "Use this sidebar to jump between schools, analytics, and global settings.",
              side: "right",
              align: "start"
            }
          }
        ]}
      />
    </div>
  );
}

