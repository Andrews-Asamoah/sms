import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function InventoryLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-[250px]" />
          <Skeleton className="h-4 w-[350px] mt-2" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-[120px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px]" />
              <Skeleton className="h-3 w-[150px] mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4 mt-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
        
        <TableSkeleton columns={7} rows={5} />
      </div>
    </div>
  );
}
