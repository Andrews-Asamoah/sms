// components/dashboard/dashboard-skeletons.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// HEADER SKELETON
// ============================================================================
interface DashboardHeaderSkeletonProps {
  withGradient?: boolean;
  withRoleBadge?: boolean;
  className?: string;
}

export function DashboardHeaderSkeleton({
  withGradient = false,
  withRoleBadge = false,
  className,
}: DashboardHeaderSkeletonProps) {
  if (withGradient) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl bg-primary/5 p-8 border border-primary/10",
          className
        )}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            {withRoleBadge && <Skeleton className="h-6 w-32 rounded-full" />}
            <Skeleton className="h-10 w-[250px] md:w-[350px]" />
            <Skeleton className="h-5 w-[180px] md:w-[220px]" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-14 w-28 rounded-2xl" />
          </div>
        </div>
        {/* Decorative elements to mirror actual hero sections */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2", className)}>
      <div className="space-y-2">
        <Skeleton className="h-9 w-[300px]" />
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[180px] mt-1" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-[160px] rounded-xl" />
      </div>
    </div>
  );
}

// ============================================================================
// KPI CARD SKELETON
// ============================================================================
interface KPIGridSkeletonProps {
  count?: number;
  gridClass?: string;
  cardClass?: string;
}

export function KPIGridSkeleton({
  count = 4,
  gridClass = "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
  cardClass = "rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md",
}: KPIGridSkeletonProps) {
  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx} className={cardClass}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-1/2" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl shrink-0 ml-4" />
            </div>
            <Skeleton className="mt-4 h-3 w-5/12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// QUICK ACTIONS SKELETON
// ============================================================================
interface QuickActionsSkeletonProps {
  count?: number;
  gridClass?: string;
}

export function QuickActionsSkeleton({
  count = 4,
  gridClass = "grid grid-cols-2 md:grid-cols-4 gap-4",
}: QuickActionsSkeletonProps) {
  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="h-20 w-full rounded-2xl border border-dashed border-primary/15 bg-white/5 p-4 flex items-center gap-3"
        >
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// CHART / VISUALIZATION SKELETON
// ============================================================================
interface ChartSkeletonProps {
  title?: string;
  description?: string;
  heightClass?: string;
  className?: string;
}

export function ChartSkeleton({
  title = "Data Insights",
  description = "Visual analytics comparison",
  heightClass = "h-[300px]",
  className,
}: ChartSkeletonProps) {
  return (
    <Card className={cn("rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64 mt-1.5" />
      </CardHeader>
      <CardContent className="pt-2">
        <Skeleton className={cn("w-full rounded-xl", heightClass)} />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ACTIVITY / FEED LIST SKELETON
// ============================================================================
interface ActivityListSkeletonProps {
  title?: string;
  description?: string;
  count?: number;
  className?: string;
}

export function ActivityListSkeleton({
  title = "Recent Activity",
  description,
  count = 4,
  className,
}: ActivityListSkeletonProps) {
  return (
    <Card className={cn("rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md", className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-36" />
        {description && <Skeleton className="h-4 w-52 mt-1.5" />}
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="flex gap-4 items-start">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-3 w-7/12" />
            </div>
            <Skeleton className="h-4 w-12 shrink-0 self-center" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TABLE SKELETON
// ============================================================================
interface TableSkeletonProps {
  rowCount?: number;
  columnCount?: number;
  className?: string;
}

export function TableSkeleton({
  rowCount = 5,
  columnCount = 4,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and action bar placeholder */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Skeleton className="h-10 w-full sm:w-[300px] rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[100px] rounded-lg" />
          <Skeleton className="h-10 w-[100px] rounded-lg" />
        </div>
      </div>

      {/* Grid structure */}
      <div className="rounded-2xl border border-primary/5 bg-card/40 backdrop-blur-md overflow-hidden">
        <div className="p-4 space-y-4">
          {/* Table Header cells */}
          <div className="flex items-center gap-4 py-2 border-b border-border/60">
            {Array.from({ length: columnCount }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn(
                  "h-5 rounded",
                  i === 0 ? "w-1/4" : "w-1/6",
                  i > 1 && "hidden md:block"
                )}
              />
            ))}
          </div>

          {/* Table Body rows */}
          <div className="space-y-3">
            {Array.from({ length: rowCount }).map((_, r) => (
              <div
                key={r}
                className={cn(
                  "flex items-center gap-4 py-3 rounded-lg border border-transparent hover:bg-white/5",
                  r % 2 === 0 ? "bg-white/[0.01]" : "bg-transparent"
                )}
              >
                {Array.from({ length: columnCount }).map((_, c) => (
                  <Skeleton
                    key={c}
                    className={cn(
                      "h-5 rounded",
                      c === 0 ? "w-1/3" : c === 1 ? "w-1/5" : "w-1/8",
                      c > 1 && "hidden md:block"
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TIMETABLE TIMELINE WIDGET SKELETON
// ============================================================================
export function TimetableWidgetSkeleton() {
  return (
    <Card className="h-full shadow-2xl border-none bg-card/30 backdrop-blur-xl ring-1 ring-white/5 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/5"
          >
            <div className="flex flex-col items-center gap-1.5 min-w-[50px]">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-5 w-0.5 rounded-full" />
              <Skeleton className="h-3 w-8" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-16 rounded-lg" />
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ASSESSMENTS GRADING WIDGET SKELETON
// ============================================================================
export function AssessmentsWidgetSkeleton() {
  return (
    <Card className="h-full shadow-2xl border-none bg-card/30 backdrop-blur-xl ring-1 ring-white/5 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-8">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-6 w-8 ml-auto" />
                <Skeleton className="h-3 w-10 ml-auto" />
              </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// WIDGET CARD SKELETON (GENERIC)
// ============================================================================
interface WidgetCardSkeletonProps {
  title: string;
  className?: string;
  children: React.ReactNode;
}

export function WidgetCardSkeleton({
  title,
  className,
  children,
}: WidgetCardSkeletonProps) {
  return (
    <Card className={cn("rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md", className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="p-6 pt-2">{children}</CardContent>
    </Card>
  );
}
