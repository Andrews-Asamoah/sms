// app/auth/layout.tsx
import { GraduationCap, School, ShieldCheck, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-background selection:bg-primary/30">
      {/* Left Side - Modern Visual Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] p-10 flex-col justify-between relative overflow-hidden bg-slate-950">
        {/* Dynamic Abstract Background (CSS Mesh Gradient Illusion) */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" />
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[80px] animate-pulse"
            style={{ animationDelay: "4s" }}
          />
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] bg-repeat" />
        </div>

        {/* Header/Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              SchoolMS
            </h1>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
              Education OS
            </p>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 space-y-8 max-w-lg mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm font-medium backdrop-blur-md mb-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>The Next Generation of School Management</span>
          </div>

          <h2 className="text-5xl font-extrabold leading-[1.1] text-white tracking-tight">
            Manage your institution with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              precision.
            </span>
          </h2>

          <p className="text-slate-300 text-lg leading-relaxed font-light">
            Empower your educators, engage your students, and streamline your
            administrative workflows in one unified, intelligent platform.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md shadow-xl transition-all hover:bg-white/10">
              <School className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-medium text-white/90">
                Multi-tenant Architecture
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md shadow-xl transition-all hover:bg-white/10">
              <ShieldCheck className="h-5 w-5 text-green-400" />
              <span className="text-sm font-medium text-white/90">
                Enterprise Security
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex justify-between items-center text-slate-500 text-sm font-medium">
          <p>© {new Date().getFullYear()} SchoolMS platform</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>

      {/* Right Side - Form Content */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 xl:p-24 relative bg-slate-50 dark:bg-slate-950 max-h-screen overflow-y-auto">
        {/* Mobile-only background effects */}
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
        </div>

        <div className="w-full max-w-[420px] relative z-10">{children}</div>
      </div>
    </div>
  );
}
