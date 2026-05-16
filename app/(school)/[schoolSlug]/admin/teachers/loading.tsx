import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { GraduationCap, Users, Clock } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

export default function TeachersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <Skeleton className="h-10 w-[150px]" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <StatCard
          title="Total Teachers"
          value={<Skeleton className="h-8 w-16" />}
          icon={GraduationCap}
        />
        <StatCard
          title="Active Teachers"
          value={<Skeleton className="h-8 w-16" />}
          icon={Users}
          iconClassName="text-green-600"
        />
        <StatCard
          title="Inactive Teachers"
          value={<Skeleton className="h-8 w-16" />}
          icon={Users}
          iconClassName="text-orange-600"
        />
        <StatCard
          title="Pending Invitations"
          value={<Skeleton className="h-8 w-16" />}
          icon={Clock}
          iconClassName="text-yellow-600"
        />
      </div>

      {/* Teachers Table Skeleton */}
      <TableSkeleton columns={6} rows={5} />
    </div>
  );
}
