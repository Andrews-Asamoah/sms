// lib/auth/guards.ts - REFACTORED Route Guards

import { redirect } from "next/navigation";
import { getSession } from "./session";
import { hasSchoolAccess } from "./school-access";
import { checkPermission } from "./api";
import type { ExtendedSession } from "./types";

// ============================================================================
// SCHOOL ACCESS GUARD
// ============================================================================

/**
 * Require school access or redirect to unauthorized
 */
export async function requireSchoolAccess(
  subdomain: string,
): Promise<ExtendedSession> {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

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
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

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
