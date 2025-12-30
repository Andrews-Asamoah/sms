// components/auth/auth-card-wrapper.tsx
import { GraduationCap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    <Card className="w-full max-w-md border-0 shadow-2xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center lg:hidden mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          {title}
        </CardTitle>
        <CardDescription className="text-center">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}