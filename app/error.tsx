// ============================================
// GLOBAL ERROR PAGE
// app/error.tsx
// ============================================
'use client';
import { useEffect } from 'react';
import { GraduationCap, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex aspect-square size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 shadow-lg">
            <GraduationCap className="size-10 text-white" />
          </div>
        </div>
        
        <div className="mb-6">
          <h1 className="mb-2 text-6xl font-bold text-gray-900">Oops!</h1>
          <h2 className="mb-4 text-2xl font-semibold text-gray-800">Something went wrong</h2>
          <p className="mb-2 text-gray-600">
            We encountered an unexpected error. Please try again.
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
            <Link href="/">
              <Home className="size-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}