import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, AlertCircle } from "lucide-react";

export default function SuspendedPage({
  params,
}: {
  params: { schoolSlug: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4 dark:bg-neutral-950">
      <Card className="w-full max-w-2xl border-none shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
        <div className="relative h-64 w-full bg-gradient-to-br from-blue-500/10 to-orange-500/10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <AlertCircle className="h-20 w-20 text-orange-500 animate-pulse" />
                <div className="h-1 w-24 bg-orange-500/20 rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-orange-500 rounded-full animate-bounce" />
                </div>
            </div>
        </div>
        
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Service Temporarily Suspended
          </CardTitle>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2 text-lg">
            Access to this portal has been restricted.
          </p>
        </CardHeader>

        <CardContent className="space-y-6 px-10">
          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/20 rounded-xl p-6 text-center">
            <p className="text-orange-800 dark:text-orange-400 font-medium">
              Important Notice for Students and Staff
            </p>
            <p className="text-sm text-orange-700/80 dark:text-orange-400/60 mt-1">
              The school management system is currently unavailable due to an administrative matter requiring attention. 
              Please contact your school administrator or IT department for more information.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-3 p-4 bg-neutral-100/50 dark:bg-neutral-900/50 rounded-lg">
              <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Support Email</p>
                <p className="text-xs text-neutral-500">support@schoolms.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-neutral-100/50 dark:bg-neutral-900/50 rounded-lg">
              <Phone className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Helpline</p>
                <p className="text-xs text-neutral-500">+233 (0) 123 456 789</p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center pb-10 pt-6">
          <Link href="/auth/login">
            <Button variant="outline" className="px-8 h-11 rounded-full border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900">
              Return to Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
