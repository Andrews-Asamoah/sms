"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  BarChart3,
  CreditCard,
  ClipboardCheck,
  Bell,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  School,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingWizardProps {
  user: {
    name: string;
    email: string;
    image: string | null;
  };
  hasSchoolAccess: boolean;
  primarySchool: {
    name: string;
    subdomain: string;
    role: string;
  } | null;
}

// ============================================================================
// FEATURE DATA
// ============================================================================

const FEATURES = [
  {
    icon: Users,
    title: "Student Management",
    description:
      "Track enrollment, profiles, attendance, and academic records in one place.",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: BookOpen,
    title: "Academics",
    description:
      "Manage subjects, classes, exams, grading systems, and report cards.",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-600 dark:text-purple-400",
  },
  {
    icon: CreditCard,
    title: "Finance & Billing",
    description:
      "Fee structures, invoices, payments, and comprehensive financial reports.",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance",
    description:
      "Real-time attendance tracking with automated reports and alerts.",
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-600 dark:text-orange-400",
  },
  {
    icon: Calendar,
    title: "Timetable",
    description: "Automated scheduling for classes, exams, and school events.",
    color: "from-rose-500 to-red-500",
    bgColor: "bg-rose-500/10",
    textColor: "text-rose-600 dark:text-rose-400",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description:
      "Visual dashboards and detailed reports for data-driven decisions.",
    color: "from-indigo-500 to-violet-500",
    bgColor: "bg-indigo-500/10",
    textColor: "text-indigo-600 dark:text-indigo-400",
  },
];

const ROLE_INFO: Record<
  string,
  { title: string; description: string; capabilities: string[] }
> = {
  admin: {
    title: "School Administrator",
    description: "You have full control over your school's management system.",
    capabilities: [
      "Manage students, teachers, and staff",
      "Configure academic years and terms",
      "Oversee finances and billing",
      "View reports and analytics",
      "Manage school settings and permissions",
    ],
  },
  owner: {
    title: "School Owner",
    description: "You have the highest level of access to your school.",
    capabilities: [
      "Everything an Administrator can do",
      "Manage subscriptions and billing",
      "Add or remove administrators",
      "Configure organization settings",
    ],
  },
  teacher: {
    title: "Teacher",
    description: "Access your classes, assignments, and student information.",
    capabilities: [
      "View and manage your assigned classes",
      "Take and review attendance",
      "Create and grade assignments",
      "Manage your gradebook",
      "Communicate with parents",
    ],
  },
  accountant: {
    title: "Accountant",
    description: "Manage the school's financial operations.",
    capabilities: [
      "Manage fee structures and invoices",
      "Process and track payments",
      "Generate financial reports",
      "Manage payroll information",
      "Track expenses and budgets",
    ],
  },
  student: {
    title: "Student",
    description: "Access your academic information and school resources.",
    capabilities: [
      "View your timetable and schedule",
      "Check grades and report cards",
      "View and submit assignments",
      "Access library resources",
      "Track your attendance",
    ],
  },
  guardian: {
    title: "Parent / Guardian",
    description: "Stay connected with your child's education.",
    capabilities: [
      "Monitor your child's academic progress",
      "View attendance records",
      "Check fee statements and make payments",
      "Communicate with teachers",
      "Receive school announcements",
    ],
  },
  staff: {
    title: "Staff Member",
    description: "Access your work tools and information.",
    capabilities: [
      "View your schedule",
      "Access assigned resources",
      "View school announcements",
      "Manage your profile",
    ],
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OnboardingWizard({
  user,
  hasSchoolAccess,
  primarySchool,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const router = useRouter();

  const firstName = user.name?.split(" ")[0] || "there";
  const roleKey = primarySchool?.role || "admin";
  const roleInfo = ROLE_INFO[roleKey] || ROLE_INFO.admin;

  const totalSteps = hasSchoolAccess ? 4 : 3;

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
  };

  const handleGoToDashboard = () => {
    if (primarySchool) {
      const roleRoute = roleKey === "guardian" ? "parent" : roleKey;
      router.push(`/${primarySchool.subdomain}/${roleRoute}/dashboard`);
    } else {
      router.push("/auth/login");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30">
      {/* Ambient background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-3xl" />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 w-full px-6 pt-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 transition-all duration-500"
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    i <= step
                      ? "w-full bg-gradient-to-r from-blue-600 to-purple-600"
                      : "w-0"
                  }`}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Step {step + 1} of {totalSteps}
          </p>
        </div>
      </div>

      {/* Content area */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-2xl shadow-blue-500/25">
                <GraduationCap className="h-12 w-12 text-white" />
              </div>

              <div className="space-y-3">
                <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                  Welcome, {firstName}!
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg mx-auto">
                  We&apos;re excited to have you on SchoolMS — the complete
                  school management platform.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Let&apos;s get you set up in just a few steps</span>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>

              <Button
                onClick={handleNext}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl shadow-blue-500/20 px-8 h-12 text-base"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Step 1: Platform Features */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Everything You Need
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  SchoolMS brings all your school management tools into one
                  powerful platform.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FEATURES.map((feature, i) => (
                  <Card
                    key={feature.title}
                    className="group border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <CardContent className="p-5">
                      <div
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${feature.bgColor} mb-3`}
                      >
                        <feature.icon
                          className={`h-5 w-5 ${feature.textColor}`}
                        />
                      </div>
                      <h3 className="font-semibold text-sm mb-1 text-slate-900 dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Role Guide (for users with school access) / Invitation Guide (without) */}
          {step === 2 && hasSchoolAccess && primarySchool && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium mb-2">
                  <ShieldCheck className="h-4 w-4" />
                  Your Role
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {roleInfo.title}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {roleInfo.description}
                </p>
              </div>

              <Card className="border-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-xl max-w-lg mx-auto">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                      <School className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {primarySchool.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {primarySchool.role} Access
                      </p>
                    </div>
                  </div>

                  <div className="border-t dark:border-slate-700 pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      What you can do
                    </p>
                    <ul className="space-y-2.5">
                      {roleInfo.capabilities.map((capability) => (
                        <li
                          key={capability}
                          className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300"
                        >
                          <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          {capability}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: No school access - invitation guide */}
          {step === 2 && !hasSchoolAccess && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium mb-2">
                  <Bell className="h-4 w-4" />
                  Almost There
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Waiting for Access
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your account is set up, but you need to be added to a school
                  to get started.
                </p>
              </div>

              <Card className="border-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-xl max-w-lg mx-auto">
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">
                          Check Your Email
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Your school administrator may have sent you an
                          invitation to <strong>{user.email}</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">
                          Contact Your Admin
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ask your school administrator to add you to the
                          system.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">
                          You&apos;ll Be Notified
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Once you&apos;re added, you&apos;ll receive an email
                          with next steps.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Final Step: Go to Dashboard / Sign Out */}
          {step === totalSteps - 1 && step > 2 && (
            <div className="text-center space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl shadow-emerald-500/25">
                <Sparkles className="h-10 w-10 text-white" />
              </div>

              <div className="space-y-3">
                <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  You&apos;re All Set!
                </h2>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                  Your dashboard is ready. Dive in and start managing{" "}
                  <strong>{primarySchool?.name}</strong>.
                </p>
              </div>

              <Button
                onClick={handleGoToDashboard}
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl shadow-emerald-500/20 px-10 h-13 text-base"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="relative z-10 w-full px-6 pb-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={step === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {step < totalSteps - 1 ? (
              <Button
                onClick={handleNext}
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : hasSchoolAccess ? (
              <Button
                onClick={handleGoToDashboard}
                className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/auth/login")}
                variant="outline"
                className="gap-2"
              >
                Back to Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
