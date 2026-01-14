// ============================================================
// app/unauthorized/page.tsx - Unauthorized Access Page
// ============================================================

import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="text-center max-w-md px-4">
        <Shield className="h-24 w-24 text-red-600 dark:text-red-400 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          Access Denied
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
          You don't have permission to access this resource.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild variant="default">
            <Link href="/callback">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/support">Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
