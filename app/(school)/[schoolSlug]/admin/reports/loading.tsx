import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ReportsLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <Skeleton className="h-9 w-[200px]" />
          <Skeleton className="h-4 w-[350px] mt-2" />
        </div>
      </div>

      <div className="grid gap-8">
        {Array.from({ length: 2 }).map((_, categoryIdx) => (
          <div key={categoryIdx} className="space-y-4">
            <div>
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[300px] mt-1" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, itemIdx) => (
                <Card key={itemIdx}>
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="ml-auto h-5 w-5 rounded-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-[150px]" />
                    <Skeleton className="h-4 w-[250px] mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
