// app/auth/layout.tsx
import { GraduationCap, School, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-blue-600 to-purple-600 p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SchoolMS</h1>
              <p className="text-blue-100 text-sm">School Management System</p>
            </div>
          </div>

          <div className="space-y-6 max-w-md">
            <h2 className="text-4xl font-bold leading-tight">
              Welcome to your school portal
            </h2>
            <p className="text-blue-100 text-lg">
              Manage your school efficiently with our comprehensive management
              system. Access all your data in one place.
            </p>

            <div className="flex gap-8 pt-6">
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <School className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">Multi-tenant</p>
              </div>
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">Role-based</p>
              </div>
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Lock className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">Secure</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-blue-100 text-sm">
            © {new Date().getFullYear()} SchoolMS. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side - Form Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        {children}
      </div>
    </div>
  );
}
