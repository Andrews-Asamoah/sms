// ============================================
// OPTIONAL: Loading State for School Layout
// app/(school)/[schoolSlug]/loading.tsx
// ============================================
import { Loader2 } from "lucide-react";

export default function SchoolLoading() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading school data...</p>
      </div>
    </div>
  );
}
