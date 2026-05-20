// app/(school)/[schoolSlug]/teacher/loading.tsx
import {
  DashboardHeaderSkeleton,
  QuickActionsSkeleton,
  WidgetCardSkeleton,
} from "@/components/dashboard/dashboard-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeacherDashboardLoading() {
  return (
    <div className="space-y-10 p-6 md:p-10 max-w-7xl mx-auto min-h-screen bg-transparent pb-20">
      {/* Curved Hero gradient header skeleton */}
      <DashboardHeaderSkeleton withGradient={true} withRoleBadge={true} />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Classes Today skeleton */}
          <WidgetCardSkeleton title="Classes Today" className="shadow-2xl bg-card/30 backdrop-blur-xl">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
            </div>
          </WidgetCardSkeleton>

          {/* Quick Actions grid skeleton */}
          <WidgetCardSkeleton title="Quick Actions" className="shadow-2xl bg-card/30 backdrop-blur-xl">
            <QuickActionsSkeleton count={4} gridClass="grid grid-cols-2 md:grid-cols-4 gap-4" />
          </WidgetCardSkeleton>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Upcoming Assessments skeleton */}
          <WidgetCardSkeleton title="Upcoming Assessments" className="shadow-2xl bg-card/30 backdrop-blur-xl">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 border-b border-dashed border-white/10">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </WidgetCardSkeleton>

          {/* Announcement Widget skeleton */}
          <WidgetCardSkeleton title="Announcements" className="shadow-2xl bg-card/30 backdrop-blur-xl">
            <div className="space-y-4">
              <Skeleton className="h-[90px] w-full rounded-2xl" />
              <Skeleton className="h-[90px] w-full rounded-2xl" />
            </div>
          </WidgetCardSkeleton>
        </div>
      </div>
    </div>
  );
}
