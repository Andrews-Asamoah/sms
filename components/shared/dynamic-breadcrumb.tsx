// components/shared/dynamic-breadcrumb.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBreadcrumbContext } from "@/lib/breadcrumb-context";

interface DynamicBreadcrumbProps {
  /**
   * The human-readable label to display in the breadcrumb trail for
   * the current page (or for the pathname specified via `pathname`).
   *
   * Example: `<DynamicBreadcrumb label="John Doe" />`
   */
  label: string;

  /**
   * Optional explicit pathname to register the label for.
   * Defaults to the current route pathname from Next.js.
   */
  pathname?: string;
}

/**
 * Render this component anywhere inside a page to register a dynamic
 * breadcrumb label for that page's URL.  The label will be picked up
 * by `BaseHeader` and displayed instead of the raw URL segment.
 *
 * The component renders nothing visible — it only manages context state.
 *
 * @example
 * ```tsx
 * // In a teacher detail page (server component wrapper)
 * <DynamicBreadcrumb label={`${teacher.firstName} ${teacher.lastName}`} />
 * ```
 */
export function DynamicBreadcrumb({ label, pathname }: DynamicBreadcrumbProps) {
  const currentPathname = usePathname();
  const resolvedPathname = pathname ?? currentPathname;
  const { setLabel, removeLabel } = useBreadcrumbContext();

  useEffect(() => {
    if (label && resolvedPathname) {
      setLabel(resolvedPathname, label);
    }

    return () => {
      if (resolvedPathname) {
        removeLabel(resolvedPathname);
      }
    };
    // We intentionally only react to label/pathname changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, resolvedPathname]);

  return null; // renders nothing — purely a side-effect component
}
