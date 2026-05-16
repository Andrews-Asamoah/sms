import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl mx-auto">
      <div>
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-5 w-[400px] mt-3" />
      </div>

      <Separator className="bg-slate-200 dark:bg-slate-800" />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Logo Management Skeleton */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-md overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <Skeleton className="h-6 w-[150px]" />
              <Skeleton className="h-4 w-[200px] mt-2" />
            </CardHeader>
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <Skeleton className="h-32 w-32 rounded-full" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-8 w-3/4 rounded-md" />
            </CardContent>
          </Card>
        </div>

        {/* Basic Info Management Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[300px] mt-2" />
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-20 w-full" />
              </div>
              <Skeleton className="h-10 w-[120px]" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
