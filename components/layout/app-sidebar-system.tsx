// components/layout/app-sidebar-system.tsx
"use client";
import { BaseSidebar } from "./base-sidebar";
import { systemNavSections } from "@/components/layout/system-nav.config";

interface AppSidebarSystemProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function AppSidebarSystem({ user, ...props }: AppSidebarSystemProps) {
  return (
    <BaseSidebar
      logoName="SchoolMS"
      logoImage="/wis-logo.png"
      logoPlan="Super Admin Portal"
      logoHref="/"
      navSections={systemNavSections}
      user={user}
      {...props}
    />
  );
}
