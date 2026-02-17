// app/(school)/[schoolSlug]/teacher/loading.tsx
import { Loader2 } from "lucide-react";

export default function TeacherLoading() {
  return (
    <div className="flex items-center justify-center min-h-100">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading teacher portal...
        </p>
      </div>
    </div>
  );
}
