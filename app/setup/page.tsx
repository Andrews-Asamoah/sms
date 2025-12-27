// app/setup/page.tsx
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SetupWizard from "@/components/setUpWizard";

export default async function SetupPage() {
  // Server-side check - most efficient way
  const [superAdminCount, completedSchoolCount] = await Promise.all([
    prisma.userProfile.count({ where: { isSuperAdmin: true } }),
    prisma.school.count({ where: { setupCompleted: true } }),
  ]);

  // If setup is already complete, redirect to login
  if (superAdminCount > 0 || completedSchoolCount > 0) {
    redirect("/login?error=setup_completed");
  }

  // Setup is required, render the wizard
  return <SetupWizard />;
}

// Disable caching for this page
export const dynamic = "force-dynamic";
export const revalidate = 0;