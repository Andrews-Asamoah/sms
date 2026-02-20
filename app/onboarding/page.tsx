// ============================================================
// app/onboarding/page.tsx - Onboarding Page
// ============================================================

import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getPrimarySchool } from "@/lib/auth/school-access";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Welcome to SchoolMS",
  description: "Get started with your school management dashboard",
};

export default async function OnboardingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  // Check if the user has school access
  const primarySchool = getPrimarySchool(session);

  let schoolData: { name: string; subdomain: string; role: string } | null =
    null;

  if (primarySchool) {
    // Fetch school name for display
    const school = await prisma.school.findUnique({
      where: { subdomain: primarySchool.subdomain },
      select: { name: true, subdomain: true },
    });

    if (school) {
      schoolData = {
        name: school.name,
        subdomain: school.subdomain,
        role: primarySchool.effectiveRole,
      };
    }
  }

  return (
    <OnboardingWizard
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
      hasSchoolAccess={!!primarySchool}
      primarySchool={schoolData}
    />
  );
}
