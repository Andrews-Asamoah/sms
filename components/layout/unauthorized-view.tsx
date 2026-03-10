"use client";

import { Shield, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams } from "next/navigation";

export function UnauthorizedView() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <div className="mb-6 flex justify-center">
        <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950">
          <Shield className="size-8 text-orange-600 dark:text-orange-400" />
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-2">Access Restricted</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        You do not have the required permissions to view this specific page. 
        If you believe this is an error, please contact your school administrator.
      </p>

      <Button asChild size="lg">
        <Link href={`/${schoolSlug}`}>
          <Home className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
