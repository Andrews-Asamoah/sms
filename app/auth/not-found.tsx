// app/auth/not-found.tsx
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AuthNotFound() {
  return (
    <Card className="w-full max-w-md backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-white/20 shadow-2xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <FileQuestion className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        <CardTitle className="text-2xl">Page Not Found</CardTitle>
        <CardDescription>
          The authentication page you&apos;re looking for doesn&apos;t exist
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center text-6xl font-bold text-muted-foreground/20">
          404
        </div>

        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link href="/auth/login">
              <Home className="mr-2 h-4 w-4" />
              Go to Login
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Need help?{" "}
            <Link
              href="/support"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Contact support
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
