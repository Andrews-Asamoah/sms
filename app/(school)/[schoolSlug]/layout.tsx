// app/(school)/[schoolSlug]/layout.tsx - FIXED VERSION
import { redirect, notFound } from "next/navigation";
import { getEnhancedSession } from "@/lib/auth/session";
import {
  hasSchoolAccess,
  getSchoolRole,
  getUserSchoolAccess,
} from "@/lib/auth/school-access";
import { getNavPermissions } from "@/lib/permissions/utils";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebarSchool } from "@/components/layout/app-sidebar-school";
import { SiteHeaderSchool } from "@/components/layout/site-header-school";
import prisma from "@/lib/prisma";
import { ReactNode } from "react";

interface SchoolLayoutProps {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>; // ✅ Fixed param name to match route
}

export default async function SchoolLayout({
  children,
  params,
}: SchoolLayoutProps) {
  // ✅ Await params
  const { schoolSlug } = await params;

  console.log("=".repeat(60));
  console.log(`[School Layout] 🏫 School Slug: ${schoolSlug}`);
  console.log("=".repeat(60));

  // Get session
  const session = await getEnhancedSession();
  if (!session) {
    console.log("[School Layout] ❌ No session found - redirecting to login");
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/admin/dashboard`);
  }

  console.log(`[School Layout] 👤 User: ${session.user.email}`);
  console.log(`[School Layout] 🔐 Role: ${session.user.role}`);
  console.log(`[School Layout] 👑 Is Super Admin: ${session.isSuperAdmin}`);
  console.log(`[School Layout] 👨‍💼 Is Admin: ${session.isAdmin}`);

  // Get all school access for debugging
  const allSchoolAccess = getUserSchoolAccess(session);
  console.log(
    `[School Layout] 📚 Total schools accessible: ${allSchoolAccess.length}`
  );

  if (allSchoolAccess.length > 0) {
    console.log("[School Layout] 🏫 Accessible schools:");
    allSchoolAccess.forEach((access, index) => {
      console.log(`  ${index + 1}. ${access.schoolName} (${access.subdomain})`);
      console.log(`     - Org Role: ${access.organizationRole || "none"}`);
      console.log(
        `     - Profile Roles: ${access.profileRoles.join(", ") || "none"}`
      );
      console.log(`     - Effective Role: ${access.effectiveRole}`);
    });
  }

  // Check school access using subdomain (schoolSlug)
  const hasAccess = hasSchoolAccess(session, schoolSlug);
  console.log(`[School Layout] 🔑 Has access to ${schoolSlug}: ${hasAccess}`);

  if (!hasAccess) {
    console.log(`[School Layout] ❌ No access to ${schoolSlug}`);
    console.log("[School Layout] 📋 Debug info:");
    console.log(`  - Looking for subdomain: ${schoolSlug}`);
    console.log(
      `  - Available subdomains: ${allSchoolAccess.map((a) => a.subdomain).join(", ")}`
    );
    console.log(`  - Super Admin: ${session.isSuperAdmin}`);

    if (session.isSuperAdmin) {
      console.log(
        "[School Layout] ⚠️ Super Admin should have access - possible data issue"
      );
    }

    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Get school details using subdomain
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      subscription: true,
      organization: true,
    },
  });

  if (!school) {
    console.log(
      `[School Layout] ❌ School not found in database: ${schoolSlug}`
    );
    notFound();
  }

  console.log(`[School Layout] ✅ School found: ${school.name}`);
  console.log(`[School Layout] 🆔 School ID: ${school.id}`);
  console.log(`[School Layout] 🏢 Organization ID: ${school.organizationId}`);

  // Get current academic year and term
  const academicYear = await prisma.academicYear.findFirst({
    where: {
      schoolId: school.id,
      isCurrent: true,
    },
    include: {
      terms: {
        where: { isCurrent: true },
        take: 1,
      },
    },
  });

  if (academicYear) {
    console.log(`[School Layout] 📅 Academic Year: ${academicYear.name}`);
    if (academicYear.terms[0]) {
      console.log(
        `[School Layout] 📆 Current Term: ${academicYear.terms[0].name}`
      );
    }
  } else {
    console.log("[School Layout] ⚠️ No active academic year");
  }

  // Get user's role in this school using subdomain
  const schoolRole = getSchoolRole(session, schoolSlug);

  if (!schoolRole) {
    console.log("[School Layout] ❌ No school role found");
    console.log("[School Layout] 🔍 Debugging role assignment:");
    console.log(`  - Subdomain: ${schoolSlug}`);
    console.log(`  - User memberships: ${session.memberships.length}`);
    console.log(`  - User profile exists: ${!!session.profile}`);
    console.log("[School Layout] ⚠️ INCONSISTENCY: Has access but no role!");
    redirect(`/${schoolSlug}/unauthorized`);
  }

  console.log("[School Layout] 👔 School Role Details:");
  console.log(`  - Effective Role: ${schoolRole.effectiveRole}`);
  console.log(
    `  - Organization Role: ${schoolRole.organizationRole || "none"}`
  );
  console.log(
    `  - Profile Roles: ${schoolRole.profileRoles.join(", ") || "none"}`
  );
  console.log(`  - Is Active: ${schoolRole.isActive}`);

  // Get navigation permissions
  const permissions = await getNavPermissions(session, schoolSlug);
  console.log("[School Layout] 🔐 Permissions calculated successfully");

  const userData = {
    name: session.user.name || "User",
    email: session.user.email,
    avatar: session.user.image || school.logo || "/wis-logo.png",
    role: schoolRole.effectiveRole,
  };

  console.log("[School Layout] ✅ Layout initialization complete");
  console.log("=".repeat(60));

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
