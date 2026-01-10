// components/layout/base-sidebar.tsx
"use client";
import * as React from "react";
import { LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import NavCollapsible from "./nav-collapsible";
import NavUser from "./nav-user";
import SchoolLogo from "./school-logo";

// Type definitions
export interface NavSubItem {
  title: string;
  url: string;
  badge?: string;
}

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: string;
  items?: NavSubItem[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

interface BaseSidebarProps extends React.ComponentProps<typeof Sidebar> {
  logoName: string;
  logoImage?: string;
  logoPlan?: string;
  logoHref: string;
  navSections: NavSection[];
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function BaseSidebar({
  logoName,
  logoImage,
  logoPlan,
  logoHref,
  navSections,
  user,
  ...props
}: BaseSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SchoolLogo
          name={logoName}
          logo={logoImage}
          plan={logoPlan}
          href={logoHref}
        />
      </SidebarHeader>
      <SidebarContent>
        {navSections.map((section, index) => (
          <NavCollapsible
            key={section.title || `section-${index}`}
            title={section.title}
            items={section.items}
          />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
