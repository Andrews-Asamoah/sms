// app/setup/page.tsx
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SetupWizard from "@/components/setUpWizard";


export default async function SetupPage() {
  // Check if super admin exists
  const superAdminCount = await prisma.userProfile.count({
    where: { isSuperAdmin: true },
  });

  if (superAdminCount > 0) {
    redirect("/login?error=setup_completed");
  }

  return <SetupWizard />;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;