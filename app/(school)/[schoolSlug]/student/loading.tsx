// app/(school)/[schoolSlug]/student/loading.tsx
import {
  KPIGridSkeleton,
  WidgetCardSkeleton,
} from "@/components/dashboard/dashboard-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome Header skeleton */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[280px]" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Academic & House */}
        <div className="md:col-span-2 space-y-6">
          {/* Quick Stats KPI Grid */}
          <KPIGridSkeleton
            count={2}
            gridClass="grid gap-4 md:grid-cols-2"
            cardClass="rounded-2xl border bg-card/50 shadow-sm"
          />

          {/* Recent Assessments list */}
          <WidgetCardSkeleton title="Recent Assessments">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-6 w-12 ml-auto" />
                    <Skeleton className="h-4 w-10 ml-auto rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </WidgetCardSkeleton>

          {/* About School skeleton */}
          <WidgetCardSkeleton title="About School" className="bg-primary/[0.02] border-primary/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </WidgetCardSkeleton>
        </div>

        {/* Right Column: Clubs & Classmates */}
        <div className="space-y-6">
          {/* My Clubs */}
          <WidgetCardSkeleton title="My Clubs">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </WidgetCardSkeleton>

          {/* Classmates Preview */}
          <WidgetCardSkeleton title="My Classmates">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          </WidgetCardSkeleton>

          {/* Communication Links grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-dashed p-4 flex flex-col items-center justify-center text-center space-y-2 bg-card">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="rounded-2xl border border-dashed p-4 flex flex-col items-center justify-center text-center space-y-2 bg-card">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
