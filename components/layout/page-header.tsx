"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardPageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function DashboardPageHeader({
  title,
  description,
  children,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between space-y-2 mb-6",
        className,
      )}
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center space-x-2">{children}</div>
    </div>
  );
}
