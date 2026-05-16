import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPageHeader } from "@/components/layout/page-header";

export default function NotificationsLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Notifications"
        description="Stay updated with the latest alerts and news."
      >
        <Skeleton className="h-9 w-[120px]" />
      </DashboardPageHeader>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-3 flex flex-col items-center">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-16 mt-2" />
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-hidden pb-1">
        <Skeleton className="h-8 w-[60px] rounded-full" />
        <Skeleton className="h-8 w-[80px] rounded-full" />
        <Skeleton className="h-8 w-[90px] rounded-full" />
        <Skeleton className="h-8 w-[120px] rounded-full" />
        <Skeleton className="h-8 w-[100px] rounded-full" />
      </div>

      {/* Content */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="h-3 w-[60px]" />
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-xl border bg-card">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 mt-1">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-3 w-[80px]" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
