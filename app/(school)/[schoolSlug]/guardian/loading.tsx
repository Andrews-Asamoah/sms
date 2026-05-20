// app/(school)/[schoolSlug]/guardian/loading.tsx
import {
  KPIGridSkeleton,
  WidgetCardSkeleton,
  QuickActionsSkeleton,
} from "@/components/dashboard/dashboard-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function GuardianDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[320px]" />
      </div>

      {/* 4 KPI cards grid */}
      <KPIGridSkeleton
        count={4}
        gridClass="grid gap-4 md:grid-cols-4"
        cardClass="rounded-2xl border bg-card/50 shadow-sm"
      />

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Children list preview */}
        <WidgetCardSkeleton title="My Children">
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            ))}
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </WidgetCardSkeleton>

        {/* Pending Bills list preview */}
        <WidgetCardSkeleton title="Pending Bills">
          <div className="space-y-4">
            <div className="p-3 rounded-lg border bg-card/50 space-y-3">
              <div className="flex justify-between items-center">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-5 w-16 ml-auto" />
                  <Skeleton className="h-4 w-12 ml-auto rounded-full" />
                </div>
              </div>
              <div className="pt-3 border-t border-dashed space-y-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </WidgetCardSkeleton>
      </div>

      {/* Quick Actions widget */}
      <WidgetCardSkeleton title="Quick Actions">
        <QuickActionsSkeleton count={4} gridClass="grid gap-4 grid-cols-2 md:grid-cols-4" />
      </WidgetCardSkeleton>
    </div>
  );
}
