// app/(school)/[schoolSlug]/loading.tsx
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SchoolLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md border-0 shadow-none bg-transparent">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">
            Loading school data...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
