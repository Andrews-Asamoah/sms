// components/layout/role-layout-wrapper.tsx
"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebarSchool } from "@/components/layout/app-sidebar-school";
import { SiteHeaderSchool } from "@/components/layout/site-header-school";
import { ReactNode } from "react";
import type { NavPermissions } from "@/lib/auth/types";

interface RoleLayoutWrapperProps {
  children: ReactNode;
  schoolSlug: string;
  schoolName: string;
  schoolPlan: string;
  schoolLogo?: string;
  user: {
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  academicYear: string;
  currentTerm: string | null;
  currentRole: string;
  availableRoles: string[];
  permissions: NavPermissions;
}

export function RoleLayoutWrapper({
  children,
  schoolSlug,
  schoolName,
  schoolPlan,
  schoolLogo,
  user,
  academicYear,
  currentTerm,
  currentRole,
  availableRoles,
  permissions,
}: RoleLayoutWrapperProps) {
  return (
    <SidebarProvider>
      <AppSidebarSchool
        schoolSlug={schoolSlug}
        schoolName={schoolName}
        schoolPlan={schoolPlan}
        schoolLogo={schoolLogo}
        user={user}
        permissions={permissions}
        currentActiveRole={currentRole}
      />
      <SidebarInset className="flex flex-col h-screen">
        <SiteHeaderSchool
          schoolSlug={schoolSlug}
          academicYear={academicYear}
          currentTerm={currentTerm}
          currentRole={currentRole}
          availableRoles={availableRoles}
        />
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
