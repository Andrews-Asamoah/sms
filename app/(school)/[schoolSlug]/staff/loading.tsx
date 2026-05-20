// app/(school)/[schoolSlug]/staff/loading.tsx
import {
  DashboardHeaderSkeleton,
  QuickActionsSkeleton,
  WidgetCardSkeleton,
} from "@/components/dashboard/dashboard-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function StaffDashboardLoading() {
  return (
    <div className="space-y-10 p-6 md:p-10 max-w-7xl mx-auto min-h-screen bg-transparent pb-20">
      {/* Curved Hero gradient header skeleton */}
      <DashboardHeaderSkeleton withGradient={true} withRoleBadge={true} />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Actions grid skeleton */}
          <WidgetCardSkeleton title="Quick Actions" className="shadow-2xl bg-card/30 backdrop-blur-xl">
            <QuickActionsSkeleton count={3} gridClass="grid grid-cols-2 lg:grid-cols-3 gap-4" />
          </WidgetCardSkeleton>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Announcement Widget skeleton */}
          <WidgetCardSkeleton title="Announcements" className="shadow-2xl bg-card/30 backdrop-blur-xl">
            <div className="space-y-4">
              <Skeleton className="h-[90px] w-full rounded-2xl animate-pulse" />
              <Skeleton className="h-[90px] w-full rounded-2xl animate-pulse" />
            </div>
          </WidgetCardSkeleton>
        </div>
      </div>
    </div>
  );
}
