// app/(school)/[schoolSlug]/accountant/loading.tsx
import {
  DashboardHeaderSkeleton,
  KPIGridSkeleton,
  ChartSkeleton,
  ActivityListSkeleton,
  QuickActionsSkeleton,
  WidgetCardSkeleton,
} from "@/components/dashboard/dashboard-skeletons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountantDashboardLoading() {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      {/* Header section */}
      <DashboardHeaderSkeleton />

      {/* Tabs placeholder */}
      <div className="space-y-4">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics" disabled>
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" disabled>
              Reports
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 5 KPI metrics grid */}
        <KPIGridSkeleton
          count={5}
          gridClass="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
          cardClass="rounded-2xl border-none bg-card/40 backdrop-blur-sm shadow-md"
        />

        {/* Chart & Activities section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <ChartSkeleton
            title="Financial Summary"
            description="Comparison of revenue vs expenses this term."
            heightClass="h-[320px]"
            className="lg:col-span-4 bg-card/40"
          />

          <ActivityListSkeleton
            title="Recent Expenditures"
            description="Latest processed school expenses."
            count={3}
            className="lg:col-span-3 bg-card/40"
          />
        </div>

        {/* Quick Actions & Announcements */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <WidgetCardSkeleton title="Quick Actions" className="lg:col-span-4 bg-card/40">
            <QuickActionsSkeleton count={4} gridClass="grid grid-cols-2 gap-4" />
          </WidgetCardSkeleton>

          {/* Announcement Widget skeleton placeholder */}
          <div className="lg:col-span-3">
            <WidgetCardSkeleton title="Announcements" className="bg-card/40">
              <div className="space-y-4">
                <Skeleton className="h-[80px] w-full rounded-xl" />
                <Skeleton className="h-[80px] w-full rounded-xl" />
              </div>
            </WidgetCardSkeleton>
          </div>
        </div>
      </div>
    </div>
  );
}
