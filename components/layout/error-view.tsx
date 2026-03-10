"use client";

import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ErrorViewProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorView({ error, reset }: ErrorViewProps) {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <div className="mb-6 flex justify-center">
        <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950">
          <AlertCircle className="size-8 text-red-600 dark:text-red-400" />
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md mb-4">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      
      {error.digest && (
        <code className="text-xs bg-muted p-1 px-2 rounded mb-8">
          Error ID: {error.digest}
        </code>
      )}

      <div className="flex gap-4">
        <Button onClick={reset} variant="outline" size="lg">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button asChild size="lg">
          <Link href={`/${schoolSlug}`}>
            <Home className="mr-2 h-4 w-4" />
            School Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
