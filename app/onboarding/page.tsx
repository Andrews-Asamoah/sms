// ============================================================
// app/onboarding/page.tsx - Onboarding Page (shows only once)
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

  // ── One-time onboarding gate ──────────────────────────────────────────────
  // If the user has already completed onboarding, send them straight to their
  // dashboard so they never see this page again on return visits.
  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true },
  });

  const primarySchool = getPrimarySchool(session);

  if (userRecord?.onboardingCompleted) {
    if (primarySchool) {
      const roleRoute =
        primarySchool.effectiveRole === "guardian"
          ? "parent"
          : primarySchool.effectiveRole;
      redirect(`/${primarySchool.subdomain}/${roleRoute}`);
    }
    redirect("/auth/login");
  }

  // ── Gather school data for the wizard ────────────────────────────────────
  let schoolData: { name: string; subdomain: string; role: string } | null =
    null;

  if (primarySchool) {
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
      userId={session.user.id}
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
