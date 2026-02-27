// ============================================
// SYSTEM (SUPER ADMIN) LAYOUT ERROR PAGE
// app/(system)/error.tsx
// ============================================
"use client";
import { useEffect } from "react";
import { Shield, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SystemError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleRetry = () => {
    reset(); // Reset the error boundary
    router.refresh(); // Re-run the route & server components
    setTimeout(() => window.location.reload(), 300);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-linear-to-br from-red-100 to-orange-100">
            <Shield className="size-8 text-red-600" />
          </div>
        </div>

        <div className="mb-6">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            System Error
          </h1>
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            Something went wrong
          </h2>
          <p className="mb-2 text-gray-600">
            We encountered an error in the system administration panel. Please
            try again.
          </p>
          {error.digest && (
            <p className="text-sm text-gray-500">Error ID: {error.digest}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={handleRetry}
            size="lg"
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className="size-4" />
            Try Again
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/">
              <Home className="size-4" />
              Admin Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
