import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import { CategoriesManager } from "@/components/finance/categories-manager";
import { Skeleton } from "@/components/ui/skeleton";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const metadata = {
  title: "Financial Categories | Accountant Portal",
};

interface AccountantCategoriesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AccountantCategoriesPage({
  params,
}: AccountantCategoriesPageProps) {
  const { schoolSlug } = await params;
  return (
    <Suspense fallback={<CategoriesSkeleton />}>
      <CategoriesContent schoolSlug={schoolSlug} />
    </Suspense>
  );
}

async function CategoriesContent({ schoolSlug }: { schoolSlug: string }) {
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    redirect("/login");
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    redirect("/login");
  }

  const getCachedFeeItems = unstable_cache(
    async () => {
      return prisma.feeItemRegistry.findMany({
        where: { schoolId: school.id },
        orderBy: { name: "asc" },
      });
    },
    [`fee-items-${school.id}`],
    {
      revalidate: 3600, // Cache for 1 hour
      tags: [`fee-items-${school.id}`],
    }
  );

  const getCachedExpenseCategories = unstable_cache(
    async () => {
      return prisma.expenditureCategoryRegistry.findMany({
        where: { schoolId: school.id },
        orderBy: { name: "asc" },
      });
    },
    [`expense-categories-${school.id}`],
    {
      revalidate: 3600, // Cache for 1 hour
      tags: [`expense-categories-${school.id}`],
    }
  );

  const getCachedInventoryCategories = unstable_cache(
    async () => {
      return prisma.inventoryCategory.findMany({
        where: { schoolId: school.id },
        orderBy: { name: "asc" },
      });
    },
    [`inventory-categories-${school.id}`],
    {
      revalidate: 3600, // Cache for 1 hour
      tags: [`inventory-categories-${school.id}`],
    }
  );

  const [feeItems, expenseCategories, inventoryCategories] = await Promise.all([
    getCachedFeeItems(),
    getCachedExpenseCategories(),
    getCachedInventoryCategories(),
  ]);

  return (
    <CategoriesManager 
      initialFeeItems={feeItems} 
      initialExpenseCategories={expenseCategories} 
      initialInventoryCategories={inventoryCategories}
    />
  );
}

function CategoriesSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        
        <div className="bg-background rounded-md border shadow-sm">
          <div className="flex items-center justify-between p-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[300px]" />
            </div>
            <Skeleton className="h-9 w-[120px]" />
          </div>
          <div className="p-6 pt-0 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
