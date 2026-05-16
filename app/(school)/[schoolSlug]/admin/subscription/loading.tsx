import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SubscriptionLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-[300px]" />
        <Skeleton className="h-4 w-[400px] mt-2" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-xl border-primary/5 bg-card/50 backdrop-blur-md">
          <CardHeader>
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[250px] mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-[150px]" />
          </CardContent>
        </Card>

        <Card className="rounded-xl border-primary/5 bg-card/50 backdrop-blur-md">
          <CardHeader>
            <Skeleton className="h-6 w-[200px]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-10 w-full mt-4" />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-primary/5 bg-card/50 backdrop-blur-md">
        <CardHeader>
          <Skeleton className="h-6 w-[150px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
                <Skeleton className="h-6 w-[80px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
