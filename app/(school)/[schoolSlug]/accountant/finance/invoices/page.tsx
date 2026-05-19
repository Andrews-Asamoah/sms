import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import { InvoicesClient } from "./invoices-client";
import { Skeleton } from "@/components/ui/skeleton";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getActiveContext } from "@/lib/academic/get-active-context";
import { formatStudentName } from "@/lib/utils/name-formatter";

export const metadata = {
  title: "Accountant Invoices",
};

interface AccountantInvoicesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AccountantInvoicesPage({
  params,
}: AccountantInvoicesPageProps) {
  const { schoolSlug } = await params;
  return (
    <Suspense fallback={<InvoicesSkeleton />}>
      <InvoicesContent schoolSlug={schoolSlug} />
    </Suspense>
  );
}

async function InvoicesContent({ schoolSlug }: { schoolSlug: string }) {
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

  const getCachedInvoices = unstable_cache(
    async () => {
      const whereClause: any = { schoolId: school.id };
      if (effectiveYearId) whereClause.academicYearId = effectiveYearId;
      if (effectiveTermId) whereClause.termId = effectiveTermId;

      const bills = await prisma.bill.findMany({
        where: whereClause,
        include: {
          student: {
            select: { profile: true, class: { select: { name: true } } },
          },
          feeStructure: { select: { name: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return bills.map((inv: any) => ({
        ...inv,
        studentName: inv.student?.profile
          ? formatStudentName(
              inv.student.profile.firstName,
              inv.student.profile.lastName,
              inv.student.profile.otherNames,
            )
          : "Unknown",
      }));
    },
    [`invoices-${school.id}-${effectiveYearId || 'all'}-${effectiveTermId || 'all'}`],
    {
      revalidate: 300, // Cache for 5 minutes
      tags: [`invoices-${school.id}`],
    }
  );

  const invoices = await getCachedInvoices();

  return <InvoicesClient initialInvoices={invoices} />;
}

function InvoicesSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
      </div>

      <Skeleton className="h-8 w-[200px]" />

      <div className="bg-background rounded-md border shadow-sm p-4 mt-6">
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
