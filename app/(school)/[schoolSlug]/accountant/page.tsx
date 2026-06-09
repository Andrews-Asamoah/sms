import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import { getDashboardStats } from "@/lib/finance/get-dashboard-stats";
import { DashboardClient } from "./dashboard-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Accountant Dashboard",
};

interface AccountantDashboardPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AccountantDashboardPage({
  params,
}: AccountantDashboardPageProps) {
  const { schoolSlug } = await params;
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent schoolSlug={schoolSlug} />
    </Suspense>
  );
}

async function DashboardContent({ schoolSlug }: { schoolSlug: string }) {
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    redirect("/auth/login");
  }

  const stats = await getDashboardStats(schoolSlug, session);

  return <DashboardClient stats={stats} schoolSlug={schoolSlug} />;
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-2">
          <Skeleton className="h-9 w-[300px]" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[180px] mt-2" />
        </div>
        <Skeleton className="h-10 w-[180px]" />
      </div>

      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>

        {/* Top Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[120px] mb-2" />
                <Skeleton className="h-3 w-[140px]" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts & Activity Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4 shadow-sm border-none">
            <CardHeader>
              <Skeleton className="h-6 w-[200px] mb-2" />
              <Skeleton className="h-4 w-[300px]" />
            </CardHeader>
            <CardContent className="h-[350px]">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 shadow-sm border-none">
            <CardHeader>
              <Skeleton className="h-6 w-[200px] mb-2" />
              <Skeleton className="h-4 w-[250px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-[80%]" />
                    </div>
                    <Skeleton className="h-4 w-[60px]" />
                  </div>
                ))}
                <Skeleton className="h-9 w-full mt-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Actions Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4 space-y-4">
            <Card className="shadow-sm border-none">
              <CardHeader>
                <Skeleton className="h-6 w-[150px]" />
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-3">
             <Skeleton className="h-[250px] w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
