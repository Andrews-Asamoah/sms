import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Reports | Accountant Portal",
};

export default function AccountantReportsPage() {
  return (
    <div className="p-6">
      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsContent />
      </Suspense>
    </div>
  );
}

async function ReportsContent() {
  // Placeholder for future data fetching
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-4">Reports</h1>
      <div className="bg-background rounded-md border p-6 text-center text-muted-foreground">
        Reports dashboard coming soon.
      </div>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-[200px]" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
