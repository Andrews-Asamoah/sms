// lib/auth/guards.ts - REFACTORED Route Guards

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSession, requireAuth } from "./session";
import { hasSchoolAccess, hasRoleInSchool } from "./school-access";
import { checkPermission } from "./api";
import type { ExtendedSession, EffectiveRole, ProfileRoleType } from "./types";

// ============================================================================
// SCHOOL ACCESS GUARD
// ============================================================================

/**
 * Require school access or redirect to unauthorized.
 * Calls requireAuth() so banned users are caught and redirected to login
 * before any school-level authorization check runs.
 */
export async function requireSchoolAccess(
  subdomain: string,
): Promise<ExtendedSession> {
  // requireAuth() handles: no session → redirect /auth/login
  //                        banned user → throws error (caught by error boundary)
  const session = await requireAuth();

  const hasAccess = session.isSuperAdmin || hasSchoolAccess(session, subdomain);

  if (!hasAccess) {
    redirect("/unauthorized");
  }

  return session;
}

// ============================================================================
// API SCHOOL ACCESS GUARD (NO REDIRECT)
// ============================================================================

export type ApiGuardResult =
  | { authorized: true; session: ExtendedSession }
  | { authorized: false; errorResponse: NextResponse };

/**
 * Securely verify school access inside REST API route handlers.
 * Instead of redirecting (which breaks API callers), returns a NextResponse.
 */
export async function verifyApiSchoolAccess(
  schoolSlug: string,
  allowedRoles?: (EffectiveRole | ProfileRoleType)[],
): Promise<ApiGuardResult> {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (session.user.banned) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: `Account suspended: ${session.user.banReason ?? "Unknown reason"}` },
        { status: 403 },
      ),
    };
  }

  // Super Admin bypasses all checks
  if (session.isSuperAdmin) {
    return { authorized: true, session };
  }

  // Check school access
  const hasAccess = hasSchoolAccess(session, schoolSlug);
  if (!hasAccess) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: "Forbidden: No access to this school" },
        { status: 403 },
      ),
    };
  }

  // Check specific roles if provided
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some((role) =>
      hasRoleInSchool(session, schoolSlug, role),
    );
    if (!hasRole) {
      return {
        authorized: false,
        errorResponse: NextResponse.json(
          { error: "Forbidden: Insufficient permissions" },
          { status: 403 },
        ),
      };
    }
  }

  return { authorized: true, session };
}

// ============================================================================
// PERMISSION GUARD
// ============================================================================

/**
 * Require specific permission (Better Auth) or redirect to unauthorized
 */
export async function requirePermission(
  permissions: Record<string, string[]>,
): Promise<ExtendedSession> {
  const session = await requireAuth();

  const hasPermission = await checkPermission(session.user.id, permissions);

  if (!hasPermission) {
    redirect("/unauthorized");
  }

  return session;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const Guards = {
  requireSchoolAccess,
  verifyApiSchoolAccess,
  requirePermission,
} as const;

