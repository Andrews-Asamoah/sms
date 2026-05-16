import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  withHeader?: boolean;
  withToolbar?: boolean;
}

export function TableSkeleton({
  columns = 5,
  rows = 5,
  withHeader = true,
  withToolbar = true,
}: TableSkeletonProps) {
  return (
    <Card className="backdrop-blur-sm bg-card/50 border-border/50">
      {withHeader && (
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="space-y-2">
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[350px]" />
          </div>
          {withToolbar && (
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-[150px] lg:w-[250px]" />
              <Skeleton className="h-9 w-20" />
            </div>
          )}
        </CardHeader>
      )}
      <CardContent>
        {withToolbar && !withHeader && (
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-9 w-[250px]" />
            <Skeleton className="h-9 w-24" />
          </div>
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: columns }).map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-full max-w-[100px]" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rows }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columns }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <Skeleton className="h-4 w-[150px]" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-[80px]" />
            <Skeleton className="h-8 w-[80px]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
