// lib/auth/guards.ts - REFACTORED Route Guards

import { redirect } from "next/navigation";
import { requireAuth } from "./session";
import { hasSchoolAccess } from "./school-access";
import { checkPermission } from "./api";
import type { ExtendedSession } from "./types";

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
  requirePermission,
} as const;
