import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import { InventoryClient } from "./inventory-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const metadata = {
  title: "Accountant Inventory",
};

interface AccountantInventoryPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AccountantInventoryPage({
  params,
}: AccountantInventoryPageProps) {
  const { schoolSlug } = await params;
  return (
    <Suspense fallback={<InventorySkeleton />}>
      <InventoryContent schoolSlug={schoolSlug} />
    </Suspense>
  );
}

async function InventoryContent({ schoolSlug }: { schoolSlug: string }) {
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    redirect("/auth/login");
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    redirect("/auth/login");
  }

  const getCachedInventory = unstable_cache(
    async () => {
      const items = await prisma.inventoryItem.findMany({
        where: { schoolId: school.id },
        orderBy: { name: "asc" },
      });
      return items;
    },
    [`inventory-items-${school.id}`],
    {
      revalidate: 300, // Cache for 5 minutes
      tags: [`inventory-${school.id}`],
    }
  );

  const items = await getCachedInventory();

  return <InventoryClient initialItems={items} />;
}

function InventorySkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 border-none shadow-sm h-24">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>

      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[120px]" />
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
    </div>
  );
}
