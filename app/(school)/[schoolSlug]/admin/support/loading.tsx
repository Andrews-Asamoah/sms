import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function SupportLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-[150px]" />
          <Skeleton className="h-4 w-[250px] mt-2" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-[40px]" />
                  <Skeleton className="h-3 w-[60px]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ticket list */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Card key={idx} className="border-border/60">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Skeleton className="h-5 w-5 shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Skeleton className="h-5 w-[200px]" />
                      <Skeleton className="h-5 w-[80px] rounded-full" />
                      <Skeleton className="h-4 w-[60px]" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Skeleton className="h-3 w-[100px]" />
                      <Skeleton className="h-3 w-[80px]" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
