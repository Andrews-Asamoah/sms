import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { DashboardPageHeader } from "@/components/layout/page-header";

export default function GuardiansLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Parents & Guardians"
        description="A complete directory of all parents, showing their contact information and linked students."
      >
        <Skeleton className="h-10 w-[120px]" />
      </DashboardPageHeader>
      
      <TableSkeleton columns={5} rows={5} />
    </div>
  );
}
