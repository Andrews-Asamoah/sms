"use client";

import { Compass, ArrowLeft, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface DashboardNotFoundProps {
  role: "admin" | "teacher" | "student" | "guardian" | "accountant";
}

export function DashboardNotFound({ role }: DashboardNotFoundProps) {
  const params = useParams();
  const router = useRouter();
  const schoolSlug = params.schoolSlug as string;
  const homePath = `/${schoolSlug}/${role}`;

  return (
    <div className="relative min-h-[70vh] w-full flex items-center justify-center p-4 overflow-hidden rounded-3xl bg-gradient-to-br from-background via-background/90 to-primary/5 border border-primary/5">
      {/* Decorative premium blurs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl z-10 py-6">
        {/* Main Glassmorphic Card */}
        <Card className="border-primary/10 bg-card/45 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <div className="grid gap-8 md:grid-cols-12 md:items-center">
              {/* Left Column: Visual Icon Display */}
              <div className="md:col-span-5 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative flex items-center justify-center size-24 md:size-28">
                  {/* Glowing Radar Background Rings */}
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-60 scale-75" />
                  <div className="absolute inset-0 rounded-full border border-primary/20 animate-pulse scale-95" />
                  <div className="flex size-16 md:size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary/80 shadow-lg shadow-primary/20 transform transition-transform hover:rotate-12 duration-300">
                    <Compass className="size-8 md:size-10 text-primary-foreground stroke-[1.5]" />
                  </div>
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/15">
                    Error 404
                  </span>
                </div>
              </div>

              {/* Right Column: Explanatory Content */}
              <div className="md:col-span-7 space-y-5 text-center md:text-left">
                <div className="space-y-2">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                    Lost in Translation?
                  </h1>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    The dashboard section you are looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Button
                    onClick={() => router.back()}
                    variant="outline"
                    className="rounded-xl border-primary/20 bg-background/50 hover:bg-primary/5 transition-all duration-300 group"
                  >
                    <ArrowLeft className="mr-2 size-4 transition-transform group-hover:-translate-x-1" />
                    Go Back
                  </Button>
                  <Button
                    asChild
                    className="rounded-xl bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 group"
                  >
                    <Link href={homePath}>
                      <Home className="mr-2 size-4" />
                      Dashboard Home
                      <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1 opacity-0 group-hover:opacity-100" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
