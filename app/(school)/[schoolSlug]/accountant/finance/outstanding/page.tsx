import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import { OutstandingClient } from "./outstanding-client";
import { Skeleton } from "@/components/ui/skeleton";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getActiveContext } from "@/lib/academic/get-active-context";
import { formatStudentName } from "@/lib/utils/name-formatter";

export const metadata = {
  title: "Outstanding Fees | Accountant Portal",
};

interface AccountantOutstandingPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AccountantOutstandingPage({
  params,
}: AccountantOutstandingPageProps) {
  const { schoolSlug } = await params;
  return (
    <div className="p-6">
      <Suspense fallback={<OutstandingSkeleton />}>
        <OutstandingContent schoolSlug={schoolSlug} />
      </Suspense>
    </div>
  );
}

async function OutstandingContent({ schoolSlug }: { schoolSlug: string }) {
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    redirect("/login");
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, settings: true },
  });

  if (!school) {
    redirect("/login");
  }

  // Resolve user-scoped working context
  const ctx = await getActiveContext(
    schoolSlug,
    session.user.id,
    school.settings as Record<string, string | undefined>,
    { withNames: false },
  );

  const effectiveYearId = ctx.academicYearId;
  const effectiveTermId = ctx.termId;

  const getCachedOutstanding = unstable_cache(
    async () => {
      // Find students who have unpaid bills in the target period
      const studentsWithBills = await prisma.student.findMany({
        where: {
          schoolId: school.id,
          bills: {
            some: {
              academicYearId: effectiveYearId,
              ...(effectiveTermId && { termId: effectiveTermId }),
              status: { not: "PAID" },
            }
          }
        },
        include: {
          profile: {
            select: { firstName: true, lastName: true, phone: true },
          },
          class: {
            select: { id: true, name: true },
          },
          bills: {
            where: {
              academicYearId: effectiveYearId,
              ...(effectiveTermId && { termId: effectiveTermId }),
              status: { not: "PAID" },
            },
            select: {
              balanceAmount: true,
            }
          }
        }
      });

      // Calculate the period-specific outstanding balance for each student
      const debtors = studentsWithBills.map(student => {
        const periodBalance = student.bills.reduce((sum, bill) => sum + Number(bill.balanceAmount), 0);
        return {
          ...student,
          outstandingBalance: periodBalance,
          studentName: student.profile 
            ? formatStudentName(
                student.profile.firstName,
                student.profile.lastName,
                (student.profile as any).otherNames
              )
            : "Unknown",
        };
      }).filter(s => s.outstandingBalance > 0)
        .sort((a, b) => b.outstandingBalance - a.outstandingBalance);

      // Clean up bills to avoid transferring extra data
      return debtors.map(({ bills, ...rest }) => rest);
    },
    [`outstanding-${school.id}-${effectiveYearId || 'all'}-${effectiveTermId || 'all'}`],
    {
      revalidate: 300, // Cache for 5 minutes
      tags: [`outstanding-${school.id}`],
    }
  );

  const outstandingData = await getCachedOutstanding();

  return <OutstandingClient initialData={outstandingData as any} />;
}

function OutstandingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-[300px]" />
          <Skeleton className="h-4 w-[250px]" />
        </div>
        <Skeleton className="h-8 w-[150px]" />
      </div>

      <div className="bg-background rounded-md border shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
