// ============================================================
// lib/auth/guards.ts - Route Guards
// ============================================================

import { redirect } from "next/navigation";
import { getEnhancedSession } from "./session";
import { hasSchoolAccess } from "./school-access";
import { auth } from "@/lib/auth";
import type { ExtendedSession } from "./types";

/**
 * Require specific role access
 */
export async function requireRole(
  ...roles: string[]
): Promise<ExtendedSession> {
  const session = await getEnhancedSession();

  if (!session) {
    redirect("/auth/login");
  }

  if (!roles.includes(session.user.role)) {
    redirect("/unauthorized");
  }

  return session;
}

/**
 * Require school access
 */
export async function requireSchoolAccess(
  subdomain: string
): Promise<ExtendedSession> {
  const session = await getEnhancedSession();

  if (!session) {
    redirect("/auth/login");
  }

  const hasAccess = session.isSuperAdmin || hasSchoolAccess(session, subdomain);

  if (!hasAccess) {
    redirect("/unauthorized");
  }

  return session;
}

/**
 * Require specific permission (Better Auth)
 */
export async function requirePermission(
  permissions: Record<string, string[]>
): Promise<ExtendedSession> {
  const session = await getEnhancedSession();

  if (!session) {
    redirect("/auth/login");
  }

  const result = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permissions,
    },
  });

  if (!result) {
    redirect("/unauthorized");
  }

  return session;
}
