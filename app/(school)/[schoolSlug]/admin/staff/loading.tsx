import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { DashboardPageHeader } from "@/components/layout/page-header";

export default function StaffLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Staff Directory"
        description="Manage and view all non-teaching staff members."
      >
        <Skeleton className="h-10 w-[120px]" />
      </DashboardPageHeader>
      
      <TableSkeleton columns={6} rows={5} />
    </div>
  );
}
