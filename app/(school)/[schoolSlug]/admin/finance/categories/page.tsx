import { Suspense } from "react";
import { CategoriesManager } from "@/components/finance/categories-manager";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";

interface AdminFinanceCategoriesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AdminFinanceCategoriesPage({ params }: AdminFinanceCategoriesPageProps) {
  const { schoolSlug } = await params;
  return (
    <Suspense fallback={<div>Loading categories...</div>}>
      <AdminCategoriesContent schoolSlug={schoolSlug} />
    </Suspense>
  );
}

async function AdminCategoriesContent({ schoolSlug }: { schoolSlug: string }) {
  const session = await getSession();
  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    redirect("/auth/login");
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) redirect("/auth/login");

  const getCachedData = unstable_cache(
    async () => {
      const [feeItems, expenseCategories, inventoryCategories] = await Promise.all([
        prisma.feeItemRegistry.findMany({
          where: { schoolId: school.id },
          orderBy: { name: "asc" },
        }),
        prisma.expenditureCategoryRegistry.findMany({
          where: { schoolId: school.id },
          orderBy: { name: "asc" },
        }),
        prisma.inventoryCategory.findMany({
          where: { schoolId: school.id },
          orderBy: { name: "asc" },
        }),
      ]);
      return { feeItems, expenseCategories, inventoryCategories };
    },
    [`categories-${school.id}`],
    {
      revalidate: 3600,
      tags: [`categories-${school.id}`],
    }
  );

  const { feeItems, expenseCategories, inventoryCategories } = await getCachedData();

  return (
    <CategoriesManager
      initialFeeItems={feeItems}
      initialExpenseCategories={expenseCategories}
      initialInventoryCategories={inventoryCategories}
    />
  );
}
