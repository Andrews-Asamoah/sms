// lib/layout/get-role-layout-data.ts
import { getSession } from "@/lib/auth/session";
import { getSchoolRole, getAllRolesInSchool, getActiveSchoolRole } from "@/lib/auth/school-access";
import { getNavPermissions } from "@/lib/permissions/utils";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

export async function getRoleLayoutData(
  schoolSlug: string,
  requiredRole: string | string[],
) {
  const session = await getSession();

  if (!session) {
    redirect(
      `/auth/login?callbackUrl=/${schoolSlug}/${typeof requiredRole === "string" ? requiredRole : requiredRole[0]}`,
    );
  }

  // Verify user has required role
  const schoolRole = getSchoolRole(session, schoolSlug);

  if (!schoolRole) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Determine role-specific unauthorized route
  const unauthorizedRedirect = `/${schoolSlug}/unauthorized`;

  const allowedRoles = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  // Check if user has one of the allowed roles
  const hasRequiredRole =
    allowedRoles.includes(schoolRole.effectiveRole) ||
    schoolRole.profileRoles.some((role) => allowedRoles.includes(role));

  if (!hasRequiredRole) {
    redirect(unauthorizedRedirect);
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

  // Get current academic year and term from cookies (Working Context) or system defaults
  const cookieStore = await import("next/headers").then(mod => mod.cookies());
  const workingYearId = cookieStore.get(`sms_working_year_${schoolSlug}`)?.value;
  const workingTermId = cookieStore.get(`sms_working_term_${schoolSlug}`)?.value;

  interface SchoolSettings {
    currentAcademicYearId?: string;
    currentTermId?: string;
  }

  const settings = (school.settings as SchoolSettings) || {};
  
  // Priority: 1. Cookie, 2. School Settings
  const effectiveYearId = workingYearId || settings.currentAcademicYearId;
  const effectiveTermId = workingTermId || settings.currentTermId;

  const academicYear = effectiveYearId
    ? await prisma.academicYear.findUnique({
        where: { id: effectiveYearId },
        include: {
          terms: {
            orderBy: { termNumber: "asc" },
          },
        },
      })
    : null;

  // Find the term:
  // 1. If cookie term exists and belongs to this year, use it.
  // 2. Otherwise use school settings term if it belongs to this year.
  // 3. Otherwise use the current term of the year (isCurrent=true).
  // 4. Otherwise use the first term.
  let activeTerm = null;
  if (academicYear && academicYear.terms.length > 0) {
    if (workingTermId) {
      activeTerm = academicYear.terms.find((t) => t.id === workingTermId) || null;
    }
    
    if (!activeTerm && settings.currentTermId) {
      activeTerm = academicYear.terms.find((t) => t.id === settings.currentTermId) || null;
    }

    if (!activeTerm) {
      activeTerm = academicYear.terms.find((t) => t.isCurrent) || academicYear.terms[0];
    }
  }

  // Get the active school role (respects cookies)
  const activeSchoolRole = await getActiveSchoolRole(session, schoolSlug);
  const currentActiveRole = activeSchoolRole?.effectiveRole || schoolRole.effectiveRole;
  const allRoles = getAllRolesInSchool(session, schoolSlug);

  // Get navigation permissions based on the session (permissions usually cover all roles)
  const permissions = await getNavPermissions(session, schoolSlug);

  const userData = {
    name: session.user.name || "User",
    email: session.user.email,
    avatar: session.user.image || school.logo || "/wis-logo.png",
    role: currentActiveRole, // Now reflects the switched role
  };

  return {
    session,
    school: {
      id: school.id,
      name: school.name,
      logo: school.logo,
      subdomain: school.subdomain,
      subscription: school.subscription
        ? {
            planName: school.subscription.planName,
            status: school.subscription.status,
            amount: school.subscription.amount
              ? Number(school.subscription.amount)
              : null,
          }
        : null,
    },
    schoolRole: {
      ...schoolRole,
      effectiveRole: currentActiveRole, // Override for layout
    },
    academicYear: academicYear?.name || "No Active Year",
    currentTerm: activeTerm?.name || null,
    allRoles,
    permissions,
    userData,
  };
}
