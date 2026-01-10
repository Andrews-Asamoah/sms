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
    <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
      <CardHeader className="space-y-1 pb-6">
        {/* Mobile Logo */}
        <div className="flex items-center justify-center lg:hidden mb-6">
          <div className="h-14 w-14 rounded-xl bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
        </div>

        <CardTitle className="text-3xl font-bold text-center bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {title}
        </CardTitle>

        <CardDescription className="text-center text-base text-slate-600 dark:text-slate-400">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-8">{children}</CardContent>
    </Card>
  );
}
