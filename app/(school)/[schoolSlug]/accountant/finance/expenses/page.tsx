import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import { ExpensesClient } from "./expenses-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getActiveContext } from "@/lib/academic/get-active-context";

export const metadata = {
  title: "Accountant Expenses",
};

interface AccountantExpensesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AccountantExpensesPage({
  params,
}: AccountantExpensesPageProps) {
  const { schoolSlug } = await params;
  return (
    <Suspense fallback={<ExpensesSkeleton />}>
      <ExpensesContent schoolSlug={schoolSlug} />
    </Suspense>
  );
}

async function ExpensesContent({ schoolSlug }: { schoolSlug: string }) {
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    redirect("/auth/login");
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, settings: true },
  });

  if (!school) {
    redirect("/auth/login");
  }

  // Resolve user-scoped working context (cookie override → global setting)
  const ctx = await getActiveContext(
    schoolSlug,
    session.user.id,
    school.settings as Record<string, string | undefined>,
    { withNames: false },
  );

  const effectiveYearId = ctx.academicYearId;
  const effectiveTermId = ctx.termId;

  const getCachedExpenses = unstable_cache(
    async () => {
      const where: any = { schoolId: school.id };
      if (effectiveYearId) where.academicYearId = effectiveYearId;
      if (effectiveTermId) where.termId = effectiveTermId;

      const expenses = await prisma.expense.findMany({
        where,
        include: {
          customCategory: { select: { name: true, code: true } },
          registryCategory: { select: { name: true } },
          recordedBy: { select: { name: true } },
        },
        orderBy: { date: "desc" },
      });

      return expenses.map((exp: any) => ({
        ...exp,
        category: exp.customCategory?.name || exp.registryCategory?.name || "General"
      }));
    },
    [`expenses-${school.id}-${effectiveYearId || 'all'}-${effectiveTermId || 'all'}`],
    {
      revalidate: 300, // Cache for 5 minutes
      tags: [`expenses-${school.id}`],
    }
  );

  const expenses = await getCachedExpenses();

  return <ExpensesClient initialExpenses={expenses} />;
}

function ExpensesSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>

      <Skeleton className="h-8 w-[200px]" />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 border-none shadow-sm h-24">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-8 w-24" />
        </Card>
      </div>

      <div className="bg-background rounded-md border shadow-sm p-4">
        {/* Data Table Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
