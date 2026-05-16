import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8 pb-10">
      {/* Header Section Skeleton */}
      <div className="relative overflow-hidden rounded-3xl bg-primary/5 p-8 border border-primary/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-[300px] md:w-[400px]" />
            <Skeleton className="h-4 w-[250px]" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[140px] rounded-xl" />
            <Skeleton className="h-10 w-[140px] rounded-xl" />
          </div>
        </div>
      </div>

      {/* Primary KPI Ribbon Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-8 w-[60px]" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
              <Skeleton className="mt-4 h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analysis Section Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md">
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[300px] mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, idx) => (
              <Card key={idx} className="rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md">
                <CardHeader>
                  <Skeleton className="h-6 w-[150px]" />
                  <Skeleton className="h-4 w-[200px] mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[250px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar Column Skeleton */}
        <div className="space-y-6">
          {/* Announcement Widget Skeleton */}
          <Card className="rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md">
            <CardHeader>
              <Skeleton className="h-6 w-[150px]" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-[100px] w-full rounded-xl" />
            </CardContent>
          </Card>

          {/* Recent Activity Skeleton */}
          <Card className="rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md">
            <CardHeader>
              <Skeleton className="h-6 w-[150px]" />
              <Skeleton className="h-4 w-[200px] mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex gap-4">
                  <Skeleton className="mt-1 h-2 w-2 rounded-full shrink-0" />
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
              <Skeleton className="h-10 w-full rounded-xl mt-6" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
