// app/auth/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Auth error:", error);
  }, [error]);

  return (
    <Card className="w-full max-w-md backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-white/20 shadow-2xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <CardTitle className="text-2xl">Authentication Error</CardTitle>
        <CardDescription>
          Something went wrong with the authentication process
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">
            {error.message || "An unexpected error occurred"}
          </p>
          {error.digest && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Button onClick={reset} className="w-full" variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">
              <Home className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            If this problem persists, please{" "}
            <Link
              href="/support"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              contact support
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
