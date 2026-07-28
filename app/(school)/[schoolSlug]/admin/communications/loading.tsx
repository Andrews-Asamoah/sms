import { Skeleton } from "@/components/ui/skeleton";

export default function CommunicationsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-36 rounded-md" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
