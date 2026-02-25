// lib/layout/get-role-layout-data.ts
import { getSession } from "@/lib/auth/session";
import { getSchoolRole, getAllRolesInSchool } from "@/lib/auth/school-access";
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
      `/auth/login?callbackUrl=/${schoolSlug}/${typeof requiredRole === "string" ? requiredRole : requiredRole[0]}/dashboard`,
    );
  }

  // Verify user has required role
  const schoolRole = getSchoolRole(session, schoolSlug);

  const allowedRoles = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  if (!schoolRole) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Check if user has one of the allowed roles
  const hasRequiredRole =
    allowedRoles.includes(schoolRole.effectiveRole) ||
    schoolRole.profileRoles.some((role) => allowedRoles.includes(role));

  if (!hasRequiredRole) {
    // Redirect to their appropriate portal
    // Note: 'member' role has no dedicated /member/ folder — redirect to teacher dashboard
    const roleRoute =
      schoolRole.effectiveRole === "member"
        ? "teacher"
        : schoolRole.effectiveRole;
    redirect(`/${schoolSlug}/${roleRoute}/dashboard`);
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

  // Get current academic year and term
  interface SchoolSettings {
    currentAcademicYearId?: string;
    currentTermId?: string;
  }

  const settings = (school.settings as SchoolSettings) || {};
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

  // Get all roles this user has in this school
  const allRoles = getAllRolesInSchool(session, schoolSlug);

  // Get navigation permissions
  const permissions = await getNavPermissions(session, schoolSlug);

  const userData = {
    name: session.user.name || "User",
    email: session.user.email,
    avatar: session.user.image || school.logo || "/wis-logo.png",
    role: schoolRole.effectiveRole,
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
    schoolRole,
    academicYear: academicYear?.name || "No Active Year",
    currentTerm: academicYear?.terms[0]?.name || null,
    allRoles,
    permissions,
    userData,
  };
}
