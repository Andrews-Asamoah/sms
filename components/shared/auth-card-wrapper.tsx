// components/auth/auth-card-wrapper.tsx
import { GraduationCap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardWrapperProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthCardWrapper({
  title,
  description,
  children,
}: AuthCardWrapperProps) {
  return (
    <Card className="w-full border-0 shadow-2xl bg-white/70 dark:bg-slate-800/90 backdrop-blur-2xl ring-1 ring-slate-200/50 dark:ring-slate-700/50 rounded-2xl overflow-hidden relative">
      {/* Decorative top gradient border edge */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 z-10" />

      <CardHeader className="space-y-1 pb-2 pt-4 sm:pt-6 px-4 sm:px-8 text-center relative z-20">
        {/* Mobile Logo */}
        <div className="flex items-center justify-center lg:hidden mb-2 sm:mb-4">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg ring-4 ring-white/50 dark:ring-slate-900/50">
            <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>
        </div>

        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </CardTitle>

        <CardDescription className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-4 sm:pb-6 px-4 sm:px-8 relative z-20">{children}</CardContent>
    </Card>
  );
}
