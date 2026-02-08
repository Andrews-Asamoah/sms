// components/layout/app-sidebar-school.tsx - FIXED
"use client";

import { BaseSidebar } from "./base-sidebar";
import {
  schoolNavSections,
  getPrefixedNavSections,
  filterNavByPermissions,
} from "@/components/layout/school-nav.config";
import { useMemo } from "react";
import type { NavPermissions } from "@/lib/permissions/utils";

interface AppSidebarSchoolProps {
  schoolSlug: string;
  schoolName: string;
  schoolPlan: string;
  schoolLogo?: string;
  user: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  permissions: NavPermissions;
}

export function AppSidebarSchool({
  schoolSlug,
  schoolName,
  schoolPlan,
  schoolLogo,
  user,
  permissions,
  ...props
}: AppSidebarSchoolProps) {
  // Filter navigation by permissions
  const filteredNavSections = useMemo(
    () => filterNavByPermissions(schoolNavSections, permissions),
    [permissions],
  );

  // Add school prefix to URLs
  const prefixedNavSections = useMemo(
    () => getPrefixedNavSections(schoolSlug, filteredNavSections),
    [schoolSlug, filteredNavSections],
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
