// components/layout/site-header-school.tsx
"use client";
import { BaseHeader } from "./base-header";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface SiteHeaderSchoolProps {
  schoolSlug: string;
  academicYear?: string;
}

export function SiteHeaderSchool({
  schoolSlug,
  academicYear = "2024/2025",
}: SiteHeaderSchoolProps) {
  return (
    <BaseHeader
      rootLabel="Dashboard"
      rootHref={`/${schoolSlug}/dashboard`}
      prefixToRemove={`/${schoolSlug}`}
      rightContent={
        <Badge variant="outline" className="gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-xs">{academicYear}</span>
        </Badge>
      }
    />
  );
}
