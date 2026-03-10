import { Metadata } from "next";
import { InventoryClient } from "./inventory-client";
import { requireSchoolAccess } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Inventory Management | School Management System",
  description: "Track and manage school supplies and assets",
};

interface InventoryPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function InventoryPage({ params }: InventoryPageProps) {
  const { schoolSlug } = await params;

  // Ensure user has access to this school
  await requireSchoolAccess(schoolSlug);

  return (
    <div className="p-6">
      <InventoryClient />
    </div>
  );
}
