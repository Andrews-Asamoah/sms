// ============================================
// SCHOOL LAYOUT ERROR PAGE
// app/(school)/[schoolSlug]/error.tsx
// ============================================
"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Building2,
  RefreshCw,
  Home,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SchoolError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;

  useEffect(() => {
    console.error("School layout error:", error);
  }, [error]);

  // Check if it's a permission error
  const isPermissionError =
    error.message?.toLowerCase().includes("unauthorized") ||
    error.message?.toLowerCase().includes("permission");

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-950 dark:to-orange-950">
            {isPermissionError ? (
              <Shield className="size-8 text-red-600 dark:text-red-400" />
            ) : (
              <AlertTriangle className="size-8 text-orange-600 dark:text-orange-400" />
            )}
          </div>
        </div>

        <div className="mb-6">
          <h1 className="mb-2 text-4xl font-bold text-foreground">
            {isPermissionError ? "Access Denied" : "Oops!"}
          </h1>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            {isPermissionError
              ? "You don't have permission"
              : "Something went wrong"}
          </h2>
          <p className="mb-2 text-muted-foreground">
            {isPermissionError
              ? "You don't have access to this school. Contact your administrator for help."
              : "We encountered an error while loading this page. Please try again."}
          </p>
          {error.digest && (
            <p className="text-sm text-muted-foreground mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {!isPermissionError && (
            <Button onClick={reset} size="lg" className="gap-2">
              <RefreshCw className="size-4" />
              Try Again
            </Button>
          )}
          {schoolSlug && (
            <Button
              asChild
              variant={isPermissionError ? "default" : "outline"}
              size="lg"
              className="gap-2"
            >
              <Link href="/schools">
                <Home className="size-4" />
                My Schools
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/dashboard">
              <Building2 className="size-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
