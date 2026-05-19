import { Metadata } from "next";
import { Suspense } from "react";
import { PayrollClient } from "./payroll-client";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getNavPermissions } from "@/lib/permissions/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const metadata: Metadata = {
  title: "Payroll Management | School Management System",
  description: "Manage staff salaries and generate payslips",
};

interface PayrollPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function PayrollPage({ params }: PayrollPageProps) {
  const { schoolSlug } = await params;

  return (
    <div className="p-6">
      <Suspense fallback={<PayrollSkeleton />}>
        <PayrollContent schoolSlug={schoolSlug} />
      </Suspense>
    </div>
  );
}

async function PayrollContent({ schoolSlug }: { schoolSlug: string }) {
  // Ensure user has access to this school
  const session = await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    throw new Error("School not found");
  }

  const getCachedPayroll = unstable_cache(
    async () => {
      const records = await prisma.payrollRecord.findMany({
        where: { schoolId: school.id },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        include: {
          _count: {
            select: { payslips: true },
          },
        },
      });
      return records;
    },
    [`payroll-records-${school.id}`],
    {
      revalidate: 300,
      tags: [`payroll-${school.id}`],
    }
  );

  const records = await getCachedPayroll();

  return <PayrollClient initialRecords={records} />;
}

function PayrollSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-[300px]" />
          <Skeleton className="h-4 w-[250px]" />
        </div>
        <Skeleton className="h-10 w-[180px]" />
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-6 w-[100px]" />
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-6 w-[100px]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-5 w-[100px]" />
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-6 w-[80px] rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
