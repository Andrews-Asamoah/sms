// components/layout/site-header-school.tsx - WITH ROLE SWITCHER
"use client";

import { BaseHeader } from "./base-header";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { RoleSwitcher } from "./role-switcher";

interface SiteHeaderSchoolProps {
  schoolSlug: string;
  academicYear: string;
  currentTerm?: string | null;
  currentRole: string;
  availableRoles: string[];
}

export function SiteHeaderSchool({
  schoolSlug,
  academicYear,
  currentTerm,
  currentRole,
  availableRoles,
}: SiteHeaderSchoolProps) {
  return (
    <BaseHeader
      rootLabel="Dashboard"
      rootHref={`/${schoolSlug}`}
      prefixToRemove={`/${schoolSlug}`}
      rightContent={
        <div className="flex items-center gap-2">
          {/* Role Switcher (only shows if multiple roles) */}
          <RoleSwitcher
            schoolSlug={schoolSlug}
            currentRole={currentRole}
            availableRoles={availableRoles}
          />

          {/* Academic Year Badge */}
          <Badge variant="outline" className="gap-1.5 hidden sm:flex">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">{academicYear}</span>
          </Badge>

          {/* Current Term Badge (if exists) */}
          {currentTerm && (
            <Badge variant="secondary" className="gap-1.5 hidden md:flex">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">{currentTerm}</span>
            </Badge>
          )}
        </div>
      }
    />
  );
}
