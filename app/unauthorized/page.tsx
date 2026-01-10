// app/unauthorized/page.tsx
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";

export default async function UnauthorizedPage() {
  const session = await getAuthSession();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <ShieldX className="h-8 w-8 text-red-600 dark:text-red-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
          <CardDescription className="text-base">
            You don&apos;t have permission to access this page
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
            <p className="text-sm text-red-900 dark:text-red-200">
              This page requires additional permissions that your account
              doesn&apos;t have.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              If you believe this is an error:
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
              <li>Contact your system administrator</li>
              <li>Request the necessary permissions</li>
              <li>Verify you&apos;re using the correct account</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              asChild
              className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              <Link href={session?.isSuperAdmin ? "/dashboard" : "/"}>
                <Home className="mr-2 h-5 w-5" />
                Go to Dashboard
              </Link>
            </Button>

            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
              size="lg"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
