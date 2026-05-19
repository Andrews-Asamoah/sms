// app/(school)/[schoolSlug]/accountant/academicYears/page.tsx
import { Suspense } from "react";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { unstable_cache } from "next/cache";

interface AcademicYearsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export const metadata = {
  title: "Academic Years",
};

export default async function AccountantAcademicYearsPage({
  params,
}: AcademicYearsPageProps) {
  const { schoolSlug } = await params;

  return (
    <Suspense fallback={<AcademicYearsSkeleton />}>
      <AcademicYearsContent schoolSlug={schoolSlug} />
    </Suspense>
  );
}

async function AcademicYearsContent({ schoolSlug }: { schoolSlug: string }) {
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (role?.effectiveRole !== "accountant" && !session.isSuperAdmin) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const getCachedYears = unstable_cache(
    async () => {
      const school = await prisma.school.findUnique({
        where: { subdomain: schoolSlug },
        include: {
          academicYears: {
            include: {
              terms: {
                orderBy: { termNumber: "asc" },
              },
            },
            orderBy: { startDate: "desc" },
          },
        },
      });
      return school;
    },
    [`academic-years-${schoolSlug}`],
    {
      revalidate: 600, // 10 minutes cache
      tags: [`academic-years-${schoolSlug}`],
    }
  );

  const school = await getCachedYears();

  if (!school) redirect("/");

  const now = new Date();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Academic Years & Terms
        </h1>
        <p className="text-muted-foreground mt-1">
          View academic calendar and term structures.
        </p>
      </div>

      <div className="space-y-6">
        {school.academicYears.map((year) => (
          <Card
            key={year.id}
            className="bg-card/50 backdrop-blur-md border-border/50"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{year.name}</CardTitle>
                  <CardDescription>
                    {new Date(year.startDate).toLocaleDateString()} -{" "}
                    {new Date(year.endDate).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {(() => {
                    const startDate = new Date(year.startDate);
                    const endDate = new Date(year.endDate);
                    if (startDate <= now && endDate >= now)
                      return <Badge variant="default">Active</Badge>;
                    if (startDate > now)
                      return <Badge variant="secondary">Upcoming</Badge>;
                    return <Badge variant="outline">Past</Badge>;
                  })()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Terms</h3>
                  <div className="grid gap-3 md:grid-cols-3">
                    {year.terms.map((term) => (
                      <div
                        key={term.id}
                        className="p-4 rounded-lg border bg-background/50"
                      >
                        <h4 className="font-semibold">{term.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 text-nowrap">
                          {new Date(term.startDate).toLocaleDateString()} -{" "}
                          {new Date(term.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AcademicYearsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-9 w-[300px]" />
        <Skeleton className="h-4 w-[250px] mt-2" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-card/50 backdrop-blur-md border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-[150px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-6 w-[80px] rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Separator />
                <div className="space-y-3">
                  <Skeleton className="h-6 w-[80px]" />
                  <div className="grid gap-3 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="p-4 rounded-lg border bg-background/50 space-y-2">
                        <Skeleton className="h-5 w-[100px]" />
                        <Skeleton className="h-4 w-[150px]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
