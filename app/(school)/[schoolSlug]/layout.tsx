// app/(school)/[schoolSlug]/layout.tsx
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session"; // ✅ Uses existing session.ts
import { hasSchoolAccess, getSchoolRole } from "@/lib/auth/school-access";
import { getNavPermissions } from "@/lib/permissions/utils";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebarSchool } from "@/components/layout/app-sidebar-school";
import { SiteHeaderSchool } from "@/components/layout/site-header-school";
import prisma from "@/lib/prisma";
import { ReactNode } from "react";

interface SchoolLayoutProps {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}

export default async function SchoolLayout({
  children,
  params,
}: SchoolLayoutProps) {
  const { schoolSlug } = await params;

  // Get enhanced session (already includes profile, memberships, etc.)
  const session = await getSession();

  if (!session) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/admin/dashboard`);
  }

  // Check school access
  const hasAccess = hasSchoolAccess(session, schoolSlug);

  if (!hasAccess) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Get school details
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      subscription: true,
      organization: true,
    },
  });

  if (!school) {
    notFound();
  }

  // Get current academic year and term from school settings
  interface SchoolSettings {
    currentAcademicYearId?: string;
    currentTermId?: string;
  }

  const settings = (school.settings as SchoolSettings) || {};

  // Fetch the actual academic year and term based on settings
  const academicYear = settings.currentAcademicYearId
    ? await prisma.academicYear.findUnique({
        where: { id: settings.currentAcademicYearId },
        include: {
          terms: {
            where: { id: settings.currentTermId },
            take: 1,
          },
        },
      })
    : null;

  // Get user's role in this school
  const schoolRole = getSchoolRole(session, schoolSlug);

  if (!schoolRole) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Get navigation permissions
  const permissions = await getNavPermissions(session, schoolSlug);

  const userData = {
    name: session.user.name || "User",
    email: session.user.email,
    avatar: session.user.image || school.logo || "/wis-logo.png",
    role: schoolRole.effectiveRole,
  };

  return (
    <SidebarProvider>
      <AppSidebarSchool
        schoolSlug={schoolSlug}
        schoolName={school.name}
        schoolPlan={school.subscription?.planName || "Free Plan"}
        schoolLogo={school.logo || undefined}
        user={userData}
        permissions={permissions}
      />
      <SidebarInset className="flex flex-col h-screen">
        <SiteHeaderSchool
          schoolSlug={schoolSlug}
          academicYear={academicYear?.name || "No Active Year"}
          currentTerm={academicYear?.terms[0]?.name || null}
        />
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
