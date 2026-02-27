// ============================================
// SCHOOL LAYOUT UNAUTHORIZED PAGE
// app/(school)/[schoolSlug]/unauthorized/page.tsx
// ============================================
import Link from "next/link";
import { Shield, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-linear-to-br from-red-100 to-orange-100 dark:from-red-950 dark:to-orange-950">
            <Shield className="size-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <div className="mb-6">
          <h1 className="mb-2 text-5xl font-bold text-foreground">403</h1>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Access Denied
          </h2>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access this school. Please contact
            your administrator if you believe this is an error.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/schools">
              <Home className="size-4" />
              My Schools
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/">
              <ArrowLeft className="size-4" />
              System Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
