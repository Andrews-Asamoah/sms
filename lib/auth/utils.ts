/**
 * ============================================================================
 * AUTHENTICATION UTILITIES
 * ============================================================================
 *
 * Helper functions for authentication, session management, and route protection.
 * These utilities work with Better Auth's session system.
 *
 * ============================================================================
 */

import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ExtendedSession } from "@/lib/auth/types";

// ============================================================================
// SESSION HELPERS
// ============================================================================

/**
 * Get current session or redirect to login
 * Use this in server components that require authentication
 */
export async function requireAuth(callbackUrl?: string) {
  const session = await getAuthSession();

  if (!session) {
    const returnUrl = callbackUrl || "/";
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
  }

  return session;
}

/**
 * Require SuperAdmin role or redirect
 */
export async function requireSuperAdmin(callbackUrl?: string) {
  const session = await requireAuth(callbackUrl);

  if (!session.isSuperAdmin) {
    redirect("/unauthorized");
  }

  return session;
}

/**
 * Require organization membership
 */
export async function requireOrganization(
  organizationId: string,
  callbackUrl?: string,
) {
  const session = await requireAuth(callbackUrl);

  // SuperAdmin has access to all organizations
  if (session.isSuperAdmin) {
    return session;
  }

  // Check if user is a member of the organization
  const isMember = session.memberships.some(
    (m) => m.organizationId === organizationId,
  );

  if (!isMember) {
    redirect("/unauthorized");
  }

  return session;
}

/**
 * Require specific role in organization
 */
export async function requireOrganizationRole(
  organizationId: string,
  allowedRoles: ("owner" | "admin" | "member")[],
  callbackUrl?: string,
) {
  const session = await requireOrganization(organizationId, callbackUrl);

  // SuperAdmin bypasses role checks
  if (session.isSuperAdmin) {
    return session;
  }

  const membership = session.memberships.find(
    (m) => m.organizationId === organizationId,
  );

  if (!membership || !allowedRoles.includes(membership.role)) {
    redirect("/unauthorized");
  }

  return session;
}

// ============================================================================
// ROUTE HELPERS
// ============================================================================

/**
 * Get default dashboard route for user
 */
export function getDefaultDashboardRoute(
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>,
): string {
  // SuperAdmin → SuperAdmin dashboard
  if (session.isSuperAdmin) {
    return "/superadmin";
  }

  // User with memberships → first school's dashboard
  if (session.memberships.length > 0) {
    const firstSchool = session.memberships[0].organization.school;
    if (firstSchool?.subdomain) {
      return `/${firstSchool.subdomain}/dashboard`;
    }
  }

  // User with profile roles → appropriate dashboard
  if (session.profile) {
    // Student
    if (session.profile.student?.school?.subdomain) {
      return `/${session.profile.student.school.subdomain}/dashboard`;
    }

    // Teacher
    if (session.profile.teacher?.school?.subdomain) {
      return `/${session.profile.teacher.school.subdomain}/dashboard`;
    }

    // Guardian
    if (session.profile.guardian?.school?.subdomain) {
      return `/${session.profile.guardian.school.subdomain}/dashboard`;
    }

    // Staff
    if (session.profile.staff?.school?.subdomain) {
      return `/${session.profile.staff.school.subdomain}/dashboard`;
    }
  }

  // Fallback
  return "/account/setup";
}

/**
 * Get school subdomain from session
 */
export function getSchoolSubdomain(
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>,
): string | null {
  // From memberships
  if (session.memberships.length > 0) {
    return session.memberships[0].organization.school?.subdomain || null;
  }

  // From profile
  if (session.profile) {
    return (
      session.profile.student?.school?.subdomain ||
      session.profile.teacher?.school?.subdomain ||
      session.profile.guardian?.school?.subdomain ||
      session.profile.staff?.school?.subdomain ||
      null
    );
  }

  return null;
}

/**
 * Get all schools user has access to
 */
export function getUserSchools(
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>,
) {
  const schools: Array<{
    id: string;
    name: string;
    subdomain: string;
    organizationId: string;
    role: string;
  }> = [];

  // From memberships
  for (const membership of session.memberships) {
    if (membership.organization.school) {
      schools.push({
        id: membership.organization.school.id,
        name: membership.organization.school.name,
        subdomain: membership.organization.school.subdomain,
        organizationId: membership.organizationId,
        role: membership.role,
      });
    }
  }

  // From profile (if not already in memberships)
  if (session.profile) {
    const profileSchools = [
      session.profile.student?.school,
      session.profile.teacher?.school,
      session.profile.guardian?.school,
      session.profile.staff?.school,
    ].filter((s) => s && !schools.some((school) => school.id === s.id));

    for (const school of profileSchools) {
      if (school) {
        schools.push({
          id: school.id,
          name: school.name,
          subdomain: school.subdomain,
          organizationId: school.organizationId,
          role: "member", // Default role for profile-based access
        });
      }
    }
  }

  return schools;
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

/**
 * Check if user is SuperAdmin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getAuthSession();
  return session?.isSuperAdmin || false;
}

/**
 * Check if user is organization owner
 */
export async function isOrganizationOwner(
  organizationId: string,
): Promise<boolean> {
  const session = await getAuthSession();

  if (!session) return false;
  if (session.isSuperAdmin) return true;

  return session.memberships.some(
    (m) => m.organizationId === organizationId && m.role === "owner",
  );
}

/**
 * Check if user is organization admin or owner
 */
export async function isOrganizationAdmin(
  organizationId: string,
): Promise<boolean> {
  const session = await getAuthSession();

  if (!session) return false;
  if (session.isSuperAdmin) return true;

  return session.memberships.some(
    (m) =>
      m.organizationId === organizationId &&
      (m.role === "owner" || m.role === "admin"),
  );
}

/**
 * Get user's role in organization
 */
export async function getOrganizationRole(
  organizationId: string,
): Promise<"owner" | "admin" | "member" | null> {
  const session = await getAuthSession();

  if (!session) return null;
  if (session.isSuperAdmin) return "owner"; // SuperAdmin acts as owner

  const membership = session.memberships.find(
    (m) => m.organizationId === organizationId,
  );

  return membership?.role || null;
}

// ============================================================================
// PROFILE HELPERS
// ============================================================================

/**
 * Get user's profile type
 */
export function getProfileType(
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>,
): "student" | "teacher" | "guardian" | "staff" | null {
  if (!session.profile) return null;

  if (session.profile.student) return "student";
  if (session.profile.teacher) return "teacher";
  if (session.profile.guardian) return "guardian";
  if (session.profile.staff) return "staff";

  return null;
}

/**
 * Check if user has specific profile type
 */
export async function hasProfileType(
  type: "student" | "teacher" | "guardian" | "staff",
): Promise<boolean> {
  const session = await getAuthSession();
  if (!session?.profile) return false;

  return !!session.profile[type];
}

// ============================================================================
// URL HELPERS
// ============================================================================

/**
 * Build school URL
 */
export function buildSchoolUrl(subdomain: string, path: string = ""): string {
  const basePath = `/${subdomain}`;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${cleanPath}`;
}

/**
 * Get login URL with callback
 */
export function getLoginUrl(callbackUrl?: string): string {
  if (!callbackUrl) return "/auth/login";
  return `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

/**
 * Get signup URL with callback
 */
export function getSignupUrl(callbackUrl?: string): string {
  if (!callbackUrl) return "/auth/signup";
  return `/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
