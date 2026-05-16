import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPageHeader } from "@/components/layout/page-header";

export default function AnnouncementsLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Announcements"
        description="Stay informed with the latest updates from your school."
      >
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[150px]" />
          <Skeleton className="h-9 w-[150px]" />
        </div>
      </DashboardPageHeader>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 flex items-center gap-3 border bg-muted/20">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-8" />
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-[60px] rounded-full" />
          <Skeleton className="h-8 w-[70px] rounded-full" />
          <Skeleton className="h-8 w-[70px] rounded-full" />
          <Skeleton className="h-8 w-[100px] rounded-full" />
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card animate-pulse h-52 flex flex-col"
          >
            <div className="h-1 w-full bg-muted" />
            <div className="p-4 flex-1 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <Skeleton className="h-4 w-[60px] rounded-full" />
                <Skeleton className="h-3 w-[80px]" />
              </div>
              <Skeleton className="h-5 w-3/4 mt-2" />
              <div className="space-y-2 mt-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <div className="mt-auto pt-3 border-t flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-3 w-[80px]" />
                </div>
                <Skeleton className="h-3 w-[100px]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
