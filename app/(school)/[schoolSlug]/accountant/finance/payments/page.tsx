import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import { PaymentsClient } from "./payments-client";
import { Skeleton } from "@/components/ui/skeleton";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getActiveContext } from "@/lib/academic/get-active-context";
import { formatStudentName } from "@/lib/utils/name-formatter";

export const metadata = {
  title: "Accountant Payments",
};

interface AccountantPaymentsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AccountantPaymentsPage({
  params,
}: AccountantPaymentsPageProps) {
  const { schoolSlug } = await params;
  return (
    <Suspense fallback={<PaymentsSkeleton />}>
      <PaymentsContent schoolSlug={schoolSlug} />
    </Suspense>
  );
}

async function PaymentsContent({ schoolSlug }: { schoolSlug: string }) {
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

  const getCachedPayments = unstable_cache(
    async () => {
      const whereClause: any = { schoolId: school.id };
      if (effectiveYearId || effectiveTermId) {
        whereClause.bill = {
          ...(effectiveYearId && { academicYearId: effectiveYearId }),
          ...(effectiveTermId && { termId: effectiveTermId }),
        };
      }

      const payments = await prisma.payment.findMany({
        where: whereClause,
        include: {
          student: {
            select: { profile: true, class: { select: { name: true } } },
          },
          bill: {
            select: {
              billNumber: true,
              feeStructure: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return payments.map((p: any) => ({
        ...p,
        studentName: p.student?.profile
          ? formatStudentName(
              p.student.profile.firstName,
              p.student.profile.lastName,
              p.student.profile.otherNames,
            )
          : "Unknown",
      }));
    },
    [`payments-${school.id}-${effectiveYearId || 'all'}-${effectiveTermId || 'all'}`],
    {
      revalidate: 300, // Cache for 5 minutes
      tags: [`payments-${school.id}`],
    }
  );

  const payments = await getCachedPayments();

  return <PaymentsClient initialPayments={payments} />;
}

import { TableSkeleton, DashboardHeaderSkeleton } from "@/components/dashboard/dashboard-skeletons";

function PaymentsSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardHeaderSkeleton />
      <TableSkeleton rowCount={6} columnCount={5} className="mt-6" />
    </div>
  );
}

