import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Users, UserCheck, GraduationCap, UserX } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

export default function StudentsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        {/* We use StatCard with a loading skeleton value */}
        <StatCard title="Total Students" value={<Skeleton className="h-8 w-16" />} icon={Users} />
        <StatCard
          title="Active"
          value={<Skeleton className="h-8 w-16" />}
          icon={UserCheck}
          iconClassName="text-green-600"
        />
        <StatCard
          title="Graduated"
          value={<Skeleton className="h-8 w-16" />}
          icon={GraduationCap}
          iconClassName="text-blue-600"
        />
        <StatCard
          title="Withdrawn"
          value={<Skeleton className="h-8 w-16" />}
          icon={UserX}
          iconClassName="text-orange-600"
        />
      </div>

      {/* Students Table Skeleton */}
      <TableSkeleton columns={6} rows={5} />
    </div>
  );
}
