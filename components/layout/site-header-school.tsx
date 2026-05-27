"use client";

import { useMemo } from "react";
import { BaseHeader } from "./base-header";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { RoleSwitcher } from "./role-switcher";
import { useSidebar } from "@/components/ui/sidebar";
import { CompactYearTermSwitcher } from "./compact-year-term-switcher";

const PRIVILEGED_ROLES = ["admin", "owner", "accountant", "headteacher", "superAdmin"];

import type { AcademicYearOption } from "@/lib/layout/get-role-layout-data";

interface SiteHeaderSchoolProps {
  schoolSlug: string;
  academicYear: string;
  currentTerm?: string | null;
  currentRole: string;
  availableRoles: string[];
  userId: string; // For user-scoped academic context cookies
  academicYears: AcademicYearOption[];
}

export function SiteHeaderSchool({
  schoolSlug,
  academicYear,
  currentTerm,
  currentRole,
  availableRoles,
  userId,
  academicYears,
}: SiteHeaderSchoolProps) {
  const { state } = useSidebar();
  const isPrivileged = PRIVILEGED_ROLES.includes(currentRole);
  const sidebarCollapsed = state === "collapsed";

  const dashboardRoot = useMemo(() => {
    switch (currentRole) {
      case "accountant":
        return `/${schoolSlug}/accountant`;
      case "admin":
      case "owner":
      case "headteacher":
      case "superAdmin":
        return `/${schoolSlug}/admin`;
      case "teacher":
        return `/${schoolSlug}/teacher`;
      case "student":
        return `/${schoolSlug}/student`;
      case "guardian":
        return `/${schoolSlug}/guardian`;
      default:
        return `/${schoolSlug}`;
    }
  }, [currentRole, schoolSlug]);

  return (
    <BaseHeader
      rootLabel="Dashboard"
      rootHref={dashboardRoot}
      prefixToRemove={`/${schoolSlug}`}
      rightContent={
        <div className="flex items-center gap-2">
          {/* Role Switcher (only shows if multiple roles) */}
          <RoleSwitcher
            schoolSlug={schoolSlug}
            currentRole={currentRole}
            availableRoles={availableRoles}
          />

          {isPrivileged ? (
            // Privileged roles:
            // - Sidebar expanded → badges are redundant (switcher is in sidebar), hide them
            // - Sidebar collapsed → sidebar switcher is hidden, show compact interactive dropdown
            sidebarCollapsed ? (
              <CompactYearTermSwitcher currentRole={currentRole} userId={userId} academicYears={academicYears} />
            ) : null
          ) : (
            // Non-privileged roles (teacher, student, guardian):
            // Always show read-only context badges
            <>
              <Badge variant="outline" className="gap-1.5 hidden sm:flex">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">{academicYear}</span>
              </Badge>
              {currentTerm && (
                <Badge variant="secondary" className="gap-1.5 hidden md:flex">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">{currentTerm}</span>
                </Badge>
              )}
            </>
          )}
        </div>
      }
    />
  );
}
