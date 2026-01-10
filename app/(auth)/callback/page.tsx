// app/callback/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;

    // No session - redirect to login
    if (!session) {
      router.replace("/login");
      return;
    }

    // No role or invalid session - redirect to login with error
    if (!session.user?.role) {
      console.error("Invalid session: No role found");
      router.replace("/login?error=invalid-session");
      return;
    }

    // At this point, TypeScript knows session.user.role exists
    const userRole = session.user.role;
    const redirectPath = getRedirectPath(userRole);
    console.log("Auth callback - redirecting to:", redirectPath);
    router.replace(redirectPath);
  }, [session, isPending, router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-linear-to-br from-blue-400/20 to-purple-400/20 dark:from-blue-600/10 dark:to-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-linear-to-tl from-purple-400/20 to-blue-400/20 dark:from-purple-600/10 dark:to-blue-600/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center animate-in fade-in zoom-in duration-300">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-8 md:p-12 max-w-md mx-4">
          {/* Animated loader */}
          <div className="inline-block animate-spin">
            <Loader2 className="h-16 w-16 text-blue-600 dark:text-blue-400" />
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6 mb-8">
            <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
            <div
              className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"
              style={{ animationDelay: "0.4s" }}
            />
          </div>

          {/* Text content */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              Signing you in
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Please wait while we set up your account
            </p>

            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Authenticated</span>
              </div>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                <span>Loading dashboard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer text */}
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-500 animate-in fade-in duration-500 delay-500">
          This should only take a moment
        </p>
      </div>
    </div>
  );
}

/**
 * Determine redirect path based on user role
 * @param role - User role from session (guaranteed to be string at this point)
 * @returns Path to redirect to
 */
function getRedirectPath(role: string): string {
  switch (role) {
    case "superAdmin":
      return "/dashboard";
    case "admin":
      return "/admin/dashboard";
    case "teacher":
      return "/teacher/dashboard";
    case "student":
      return "/student/dashboard";
    case "guardian":
      return "/guardian/dashboard";
    case "accountant":
      return "/accountant/dashboard";
    default:
      // Unknown role - log and redirect to login
      console.warn(`Unknown role: ${role}, redirecting to login`);
      return "/login?error=invalid-role";
  }
}
