// ============================================================
// app/onboarding/page.tsx - Onboarding Page
// ============================================================

import { getEnhancedSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage() {
  const session = await getEnhancedSession();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="text-center max-w-md px-4">
        <GraduationCap className="h-24 w-24 text-blue-600 dark:text-blue-400 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          Welcome to SchoolMS
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
          You don&apos;t have access to any schools yet. Please contact your
          administrator.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="/support">Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
