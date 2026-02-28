// ============================================================
// components/layout/base-sidebar.tsx
// ============================================================

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
  permission?: string;
}

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: string;
  permission?: string; // Add this optional field for school navigation
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
    role?: string; // Optional role field
  };
  headerContent?: React.ReactNode;
}

export function BaseSidebar({
  logoName,
  logoImage,
  logoPlan,
  logoHref,
  navSections,
  user,
  headerContent,
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
        {headerContent}
      </SidebarHeader>
      <SidebarContent>
        {(() => {
          const allSidebarUrls = navSections
            .flatMap((section) =>
              section.items.flatMap((item) => [
                item.url,
                ...(item.items?.map((sub) => sub.url) || []),
              ]),
            )
            .filter((url) => url && url !== "#");

          return navSections.map((section, index) => (
            <NavCollapsible
              key={section.title || `section-${index}`}
              title={section.title}
              items={section.items}
              allSidebarUrls={allSidebarUrls}
            />
          ));
        })()}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
