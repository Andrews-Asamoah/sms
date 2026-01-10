// ============================================
// AUTH LAYOUT ERROR PAGE
// app/(auth)/error.tsx
// ============================================
"use client";
import { useEffect } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-gradient-to-br from-red-100 to-orange-100">
            <Lock className="size-8 text-red-600" />
          </div>
        </div>

        <div className="mb-6">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Authentication Error
          </h1>
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            Something went wrong
          </h2>
          <p className="mb-2 text-gray-600">
            We encountered an error during authentication. Please try again.
          </p>
          {error.digest && (
            <p className="text-sm text-gray-500">Error ID: {error.digest}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} size="lg" className="gap-2">
            <RefreshCw className="size-4" />
            Try Again
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/login">
              <Lock className="size-4" />
              Go to Login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
