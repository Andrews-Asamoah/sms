import { requireSchoolAccess } from "@/lib/auth/guards";
import { getActiveSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import { AnnouncementWidget } from "@/components/dashboard/announcement-widget";
import { ClassesToday } from "@/components/dashboard/teacher/classes-today";
import { UpcomingAssessments } from "@/components/dashboard/teacher/upcoming-assessments";
import {
  Users,
  Calendar,
  BookOpen,
  BadgeDollarSign,
  LayoutDashboard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function TeacherDashboard({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  // Use getActiveSchoolRole to respect the user's role switch choice
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  const effectiveRole = activeRole?.effectiveRole || "teacher";

  if (
    effectiveRole !== "teacher" &&
    effectiveRole !== "admin" &&
    effectiveRole !== "owner" &&
    effectiveRole !== "headteacher" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  return (
    <div className="space-y-10 p-6 md:p-10 max-w-7xl mx-auto min-h-screen bg-transparent pb-20">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 md:p-12 shadow-2xl ring-1 ring-white/20">
        <div className="absolute top-0 right-0 -m-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -m-10 h-60 w-60 rounded-full bg-blue-400/20 blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/90 uppercase tracking-widest shadow-inner">
              <LayoutDashboard className="h-3 w-3" />
              Portal Access
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-sm">
              Dashboard
            </h1>
            <p className="text-lg md:text-xl text-blue-100/80 font-medium italic drop-shadow-sm">
              Welcome back, {session.user.name} 👋
            </p>
          </div>

          <div className="flex gap-4">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/60 mb-1">
                Status
              </p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-bold uppercase tracking-tight">
                  {effectiveRole}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          <ClassesToday />

          <Card className="shadow-2xl border-none bg-card/30 backdrop-blur-xl ring-1 ring-white/5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <span className="h-8 w-1.5 rounded-full bg-blue-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 pt-2">
              {[
                {
                  label: "My Classes",
                  sub: "View students",
                  icon: Users,
                  href: `/${schoolSlug}/teacher/classes`,
                  color: "bg-blue-500",
                },
                {
                  label: "Schedule",
                  sub: "Weekly view",
                  icon: Calendar,
                  href: `/${schoolSlug}/teacher/schedule`,
                  color: "bg-indigo-500",
                },
                {
                  label: "Subjects",
                  sub: "My courses",
                  icon: BookOpen,
                  href: `/${schoolSlug}/teacher/subjects`,
                  color: "bg-violet-500",
                },
                {
                  label: "My Salary",
                  sub: "Payslips",
                  icon: BadgeDollarSign,
                  href: `/${schoolSlug}/teacher/salary`,
                  color: "bg-emerald-500",
                },
              ].map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="relative group h-auto flex-col items-start p-4 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-2xl overflow-hidden shadow-sm"
                  asChild
                >
                  <Link href={action.href}>
                    <div
                      className={cn(
                        "inline-flex p-2.5 rounded-xl text-white mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300",
                        action.color,
                      )}
                    >
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <div className="text-sm font-bold tracking-tight">
                        {action.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium group-hover:text-primary transition-colors">
                        {action.sub}
                      </div>
                    </div>
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          <UpcomingAssessments />
          <AnnouncementWidget />
        </div>
      </div>
    </div>
  );
}
