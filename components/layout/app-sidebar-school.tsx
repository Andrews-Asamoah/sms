// ============================================================
// components/layout/app-sidebar-school.tsx
// ============================================================
"use client";

import { BaseSidebar } from "./base-sidebar";
import {
  schoolNavSections,
  getPrefixedNavSections,
} from "@/components/layout/school-nav.config";
import { useMemo } from "react";

interface AppSidebarSchoolProps {
  schoolSlug: string;
  schoolName: string;
  schoolPlan: string;
  schoolLogo?: string;
  user: {
    name: string;
    email: string;
    avatar?: string;
    role?: string; // Add role
  };
}

export function AppSidebarSchool({
  schoolSlug,
  schoolName,
  schoolPlan,
  schoolLogo,
  user,
  ...props
}: AppSidebarSchoolProps) {
  const prefixedNavSections = useMemo(
    () => getPrefixedNavSections(`/${schoolSlug}`, schoolNavSections),
    [schoolSlug]
  );

  return (
    <BaseSidebar
      logoName={schoolName}
      logoImage={schoolLogo}
      logoPlan={schoolPlan}
      logoHref={`/${schoolSlug}/dashboard`}
      navSections={prefixedNavSections}
      user={user}
      {...props}
    />
  );
}
