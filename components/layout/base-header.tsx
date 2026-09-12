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
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NotificationBell } from "@/components/shared/notification-bell";
import { cn } from "@/lib/utils";
import { useBreadcrumbContext } from "@/lib/breadcrumb-context";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * When breadcrumb segments exceed this count on desktop, we collapse
 * the intermediate items into a "…" dropdown.
 */
const MAX_VISIBLE_SEGMENTS = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

interface BreadcrumbEntry {
  href: string;
  label: string;
  isLast: boolean;
}

interface BaseHeaderProps {
  rootLabel: string;
  rootHref: string;
  prefixToRemove?: string;
  rightContent?: React.ReactNode;
  showThemeToggle?: boolean;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Capitalise a kebab-case segment into a human-readable label. */
function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BaseHeader({
  rootLabel,
  rootHref,
  prefixToRemove,
  rightContent,
  showThemeToggle = true,
  className,
}: BaseHeaderProps) {
  const pathname = usePathname();
  const { labelMap } = useBreadcrumbContext();

  // Build the breadcrumb entries from the current pathname.
  const breadcrumbs = useMemo(() => {
    let pathToUse = pathname;
    if (prefixToRemove) {
      pathToUse = pathname.replace(prefixToRemove, "");
    }
    const pathSegments = pathToUse.split("/").filter(Boolean);

    return pathSegments.map((segment, index) => {
      // Build the full href including the removed prefix
      const hrefSegments = prefixToRemove
        ? [
            prefixToRemove.replace(/^\//, ""),
            ...pathSegments.slice(0, index + 1),
          ]
        : pathSegments.slice(0, index + 1);
      const href = "/" + hrefSegments.join("/");

      // Resolve label: context label → formatted segment fallback
      const label = labelMap[href] ?? formatSegment(segment);

      return {
        href,
        label,
        isLast: index === pathSegments.length - 1,
      };
    });
  }, [pathname, prefixToRemove, labelMap]);

  // ── Mobile back link ────────────────────────────────────────────────────
  // On small screens we show a single "← Parent" link instead of the
  // full breadcrumb trail.  This avoids wrapping / overflow issues.

  const parentCrumb: BreadcrumbEntry | null = useMemo(() => {
    if (breadcrumbs.length === 0) return null;
    if (breadcrumbs.length === 1) {
      // Only one crumb → parent is the root
      return { href: rootHref, label: rootLabel, isLast: false };
    }
    // Otherwise the second-to-last crumb is the parent
    return breadcrumbs[breadcrumbs.length - 2];
  }, [breadcrumbs, rootHref, rootLabel]);

  // ── Desktop: decide which crumbs are visible vs collapsed ──────────────

  const { visibleStart, collapsedMiddle, visibleEnd } = useMemo(() => {
    if (breadcrumbs.length <= MAX_VISIBLE_SEGMENTS) {
      return {
        visibleStart: breadcrumbs,
        collapsedMiddle: [] as BreadcrumbEntry[],
        visibleEnd: [] as BreadcrumbEntry[],
      };
    }

    // Show first item, collapse middle, show last item
    return {
      visibleStart: [breadcrumbs[0]],
      collapsedMiddle: breadcrumbs.slice(1, breadcrumbs.length - 1),
      visibleEnd: [breadcrumbs[breadcrumbs.length - 1]],
    };
  }, [breadcrumbs]);

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

          {/* ── Mobile: back link ─────────────────────────────────── */}
          {parentCrumb && (
            <Link
              href={parentCrumb.href}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors sm:hidden min-w-0"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{parentCrumb.label}</span>
            </Link>
          )}

          {/* ── Desktop: full breadcrumb trail ────────────────────── */}
          <Breadcrumb className="flex-1 min-w-0 hidden sm:flex">
            <BreadcrumbList className="flex-nowrap min-w-0">
              {/* Root crumb */}
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={rootHref}
                  className="font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {rootLabel}
                </BreadcrumbLink>
              </BreadcrumbItem>

              {/* Visible start crumbs */}
              {visibleStart.map((crumb) => (
                <React.Fragment key={crumb.href}>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem className="max-w-[200px] min-w-0">
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

              {/* Collapsed middle → ellipsis dropdown */}
              {collapsedMiddle.length > 0 && (
                <>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex items-center gap-1 outline-none"
                        aria-label="Show more breadcrumbs"
                      >
                        <BreadcrumbEllipsis className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {collapsedMiddle.map((crumb) => (
                          <DropdownMenuItem key={crumb.href} asChild>
                            <Link href={crumb.href}>{crumb.label}</Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                </>
              )}

              {/* Visible end crumbs (last item after collapse) */}
              {visibleEnd.map((crumb) => (
                <React.Fragment key={crumb.href}>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem className="max-w-[200px] min-w-0">
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
