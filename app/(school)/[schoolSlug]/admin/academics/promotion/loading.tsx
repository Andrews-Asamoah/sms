import { GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PromotionLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                End-of-Year Promotions
              </h1>
              <p className="text-muted-foreground mt-1">
                Evaluate student scores and manage promotions, repetitions,
                graduations, and special promotions.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <div className="rounded-2xl border p-6 space-y-4">
          <Skeleton className="h-6 w-1/4" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
