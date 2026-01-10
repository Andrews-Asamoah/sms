// app/no-access/page.tsx
import { ShieldAlert, Mail } from "lucide-react";
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
import { signOut } from "@/lib/auth-client";

export default async function NoAccessPage() {
  const session = await getAuthSession();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">No School Access</CardTitle>
          <CardDescription className="text-base">
            Your account is not associated with any school
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              {session?.user?.email
                ? `Your account (${session.user.email}) is not linked to any school.`
                : "Your account is not linked to any school."}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              To gain access, please:
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
              <li>Contact your school administrator</li>
              <li>Request to be added to your school&apos;s system</li>
              <li>Wait for an invitation email</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              asChild
              className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              <Link href="mailto:support@schoolms.com">
                <Mail className="mr-2 h-5 w-5" />
                Contact Support
              </Link>
            </Button>

            <Button
              onClick={() => signOut()}
              variant="outline"
              className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
              size="lg"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
