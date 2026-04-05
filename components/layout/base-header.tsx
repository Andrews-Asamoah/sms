// components/layout/base-header.tsx
"use client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NotificationBell } from "@/components/shared/notification-bell";
import { cn } from "@/lib/utils";

interface BaseHeaderProps {
  rootLabel: string;
  rootHref: string;
  prefixToRemove?: string;
  rightContent?: React.ReactNode;
  showThemeToggle?: boolean;
  className?: string;
}

export function BaseHeader({
  rootLabel,
  rootHref,
  prefixToRemove,
  rightContent,
  showThemeToggle = true,
  className,
}: BaseHeaderProps) {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    let pathToUse = pathname;
    if (prefixToRemove) {
      pathToUse = pathname.replace(prefixToRemove, "");
    }
    const pathSegments = pathToUse.split("/").filter(Boolean);

    // Map parent segment → friendly label for what follows it (an ID)
    const idContextLabels: Record<string, string> = {
      sets: "Set Details",
      students: "Student Report",
      classes: "Class",
      teachers: "Teacher",
      subjects: "Subject",
      departments: "Department",
      terms: "Term",
      years: "Year",
      tickets: "Ticket",
    };

    // Heuristic: a segment that is long (>14 chars) and not kebab-case words is an ID
    const looksLikeId = (seg: string) =>
      seg.length > 14 && !/^[a-z]+(-[a-z]+)*$/.test(seg);

    return pathSegments.map((segment, index) => {
      const hrefSegments = prefixToRemove
        ? [
            prefixToRemove.replace(/^\//, ""),
            ...pathSegments.slice(0, index + 1),
          ]
        : pathSegments.slice(0, index + 1);
      const href = "/" + hrefSegments.join("/");

      let label: string;
      if (looksLikeId(segment)) {
        const parent = pathSegments[index - 1] ?? "";
        label = idContextLabels[parent] ?? segment.slice(0, 8) + "…";
      } else {
        label = segment
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }

      return {
        href,
        label,
        isLast: index === pathSegments.length - 1,
      };
    });
  }, [pathname, prefixToRemove]);

  return (
    <header
      className={cn(
        "w-full border-b bg-background shadow-sm dark:shadow-none",
        className,
      )}
    >
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        {/* Left section - Sidebar trigger and breadcrumbs */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <SidebarTrigger className="-ml-1 hover:bg-accent/50 transition-colors shrink-0" />
          <Separator
            orientation="vertical"
            className="h-5 bg-border/60 hidden sm:block"
          />
          <Breadcrumb className="flex-1 min-w-0">
            <BreadcrumbList className="flex-wrap">
              <BreadcrumbItem className="hidden sm:block">
                <BreadcrumbLink
                  href={rootHref}
                  className="font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {rootLabel}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  <BreadcrumbSeparator className="hidden sm:block">
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem className="max-w-[180px]">
                    {!crumb.isLast ? (
                      <BreadcrumbLink
                        href={crumb.href}
                        className="text-muted-foreground hover:text-foreground transition-colors truncate block"
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="font-medium truncate block">
                        {crumb.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Right section - Custom content and theme toggle */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          {rightContent}
          <NotificationBell />
          {showThemeToggle && (
            <>
              {rightContent && (
                <Separator
                  orientation="vertical"
                  className="h-5 bg-border/60 hidden sm:block"
                />
              )}
              <ThemeToggle />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
