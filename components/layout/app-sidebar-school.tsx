// components/layout/app-sidebar-school.tsx - FIXED
"use client";

import { BaseSidebar } from "./base-sidebar";
import {
  schoolNavSections,
  getPrefixedNavSections,
  filterNavByPermissions,
  filterNavByRole,
} from "@/components/layout/school-nav.config";
import { useMemo } from "react";
import { WorkingYearSwitcher } from "./working-year-switcher";
import type { NavPermissions } from "@/lib/auth/types";

import type { AcademicYearOption } from "@/lib/layout/get-role-layout-data";

interface AppSidebarSchoolProps {
  schoolSlug: string;
  schoolName: string;
  schoolPlan: string;
  schoolLogo?: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  permissions: NavPermissions;
  currentActiveRole: string;
  userId: string; // For user-scoped academic context cookies
  academicYears: AcademicYearOption[];
}

export function AppSidebarSchool({
  schoolSlug,
  schoolName,
  schoolPlan,
  schoolLogo,
  user,
  permissions,
  currentActiveRole,
  userId,
  academicYears,
  ...props
}: AppSidebarSchoolProps) {
  // Filter navigation by both role AND permissions
  const filteredNavSections = useMemo(() => {
    // First filter by role (removes sections not relevant to this role)
    const roleFiltered = filterNavByRole(schoolNavSections, currentActiveRole);

    // Then filter by permissions (removes items user doesn't have access to)
    return filterNavByPermissions(roleFiltered, permissions);
  }, [currentActiveRole, permissions]);

  // Add school prefix to URLs
  const prefixedNavSections = useMemo(
    () =>
      getPrefixedNavSections(
        schoolSlug,
        filteredNavSections,
        currentActiveRole,
      ),
    [schoolSlug, filteredNavSections, currentActiveRole],
  );

  return (
    <BaseSidebar
      logoName={schoolName}
      logoImage={schoolLogo}
      logoPlan={schoolPlan}
      logoHref={`/${schoolSlug}`}
      navSections={prefixedNavSections}
      user={user}
      headerContent={
        ["accountant", "admin", "owner", "headteacher", "superAdmin"].includes(
          currentActiveRole,
        ) ? (
          <WorkingYearSwitcher userId={userId} academicYears={academicYears} />
        ) : null
      }
      {...props}
    />
  );
}
