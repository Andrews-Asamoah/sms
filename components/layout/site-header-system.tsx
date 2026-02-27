// components/layout/site-header-system.tsx - WITH ROLE BADGE
"use client";

import { BaseHeader } from "./base-header";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

interface SiteHeaderSystemProps {
  userName: string;
  userRole: string;
}

export function SiteHeaderSystem({
  userName,
  userRole,
}: SiteHeaderSystemProps) {
  return (
    <BaseHeader
      rootLabel="System Admin"
      rootHref="/"
      rightContent={
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 border-purple-500/50 bg-purple-500/10 text-purple-400 hidden sm:flex"
          >
            <Shield className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Super Admin</span>
          </Badge>
        </div>
      }
    />
  );
}
