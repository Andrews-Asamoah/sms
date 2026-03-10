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
    <Card className="w-full border-0 shadow-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl ring-1 ring-slate-200/50 dark:ring-slate-800/50 rounded-2xl overflow-hidden relative">
      {/* Decorative top gradient border edge */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 z-10" />

      <CardHeader className="space-y-2 pb-2 pt-8 px-8 text-center relative z-20">
        {/* Mobile Logo */}
        <div className="flex items-center justify-center lg:hidden mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg ring-4 ring-white/50 dark:ring-slate-900/50">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
        </div>

        <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </CardTitle>

        <CardDescription className="text-base text-slate-500 dark:text-slate-400 font-medium">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-5 px-8 relative z-20">{children}</CardContent>
    </Card>
  );
}
