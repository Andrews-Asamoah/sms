// lib/auth/session.ts

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ExtendedSession } from "./types";
import { profileInclude, membershipInclude } from "./types";

// ============================================================================
// CORE SESSION FUNCTION
// ============================================================================

/**
 * Get enhanced session with profile and memberships
 * Cached per request for performance
 *
 * This is the ONLY session function - use this everywhere
 */
export const getSession = cache(async (): Promise<ExtendedSession | null> => {
  try {
    // Get Better Auth session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return null;
    }

    // Fetch profile and memberships in parallel
    const [profile, memberships] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: session.user.id },
        include: profileInclude,
      }),
      prisma.member.findMany({
        where: { userId: session.user.id },
        include: membershipInclude,
      }),
    ]);

    // Determine roles
    const isSuperAdmin = session.user.role === "superAdmin";
    const isAdmin =
      isSuperAdmin ||
      memberships.some((m) => m.role === "owner" || m.role === "admin");

    const enhancedSession: ExtendedSession = {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        image: session.user.image ?? null,
        createdAt: session.user.createdAt,
        updatedAt: session.user.updatedAt,
        role: session.user.role ?? "user",
        banned: session.user.banned ?? false,
        banReason: session.user.banReason ?? null,
        banExpires: session.user.banExpires ?? null,
      },
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt,
        token: session.session.token,
        createdAt: session.session.createdAt,
        updatedAt: session.session.updatedAt,
        ipAddress: session.session.ipAddress ?? null,
        userAgent: session.session.userAgent ?? null,
        impersonatedBy: session.session.impersonatedBy ?? null,
        userId: session.session.userId,
        activeOrganizationId: session.session.activeOrganizationId ?? null,
      },
      profile,
      memberships,
      isSuperAdmin,
      isAdmin,
      isOwner: memberships.some((m) => m.role === "owner"),
    };

    return enhancedSession;
  } catch (error) {
    console.error("[Session] Error getting session:", error);
    return null;
  }
});

// ============================================================================
// CONVENIENCE ALIASES
// ============================================================================

/**
 * Alias for getSession - for backward compatibility
 * @deprecated Use getSession() instead
 */
export const getEnhancedSession = getSession;

/**
 * Alias for getSession - for backward compatibility with lib/auth.ts
 * @deprecated Use getSession() instead
 */
export const getAuthSession = getSession;

// ============================================================================
// REQUIRE AUTH FUNCTIONS
// ============================================================================

/**
 * Require authenticated session or redirect to login
 *
 * @throws Redirects to login if no session
 * @throws Error if user is banned
 */
export async function requireAuth(): Promise<ExtendedSession> {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  // Check if user is banned
  if (session.user.banned) {
    const banMessage =
      session.user.banReason || "Your account has been suspended";
    const banExpiry = session.user.banExpires
      ? ` until ${new Date(session.user.banExpires).toLocaleDateString()}`
      : "";
    throw new Error(`${banMessage}${banExpiry}`);
  }

  return session;
}

/**
 * Require specific role or redirect to unauthorized
 */
export async function requireRole(
  ...roles: string[]
): Promise<ExtendedSession> {
  const session = await requireAuth();

  if (!roles.includes(session.user.role)) {
    redirect("/unauthorized");
  }

  return session;
}

/**
 * Require super admin or redirect to unauthorized
 */
export async function requireSuperAdmin(): Promise<ExtendedSession> {
  const session = await requireAuth();

  if (!session.isSuperAdmin) {
    redirect("/unauthorized");
  }

  return session;
}

/**
 * Require admin (owner or admin in any school) or redirect to unauthorized
 */
export async function requireAdmin(): Promise<ExtendedSession> {
  const session = await requireAuth();

  if (!session.isAdmin) {
    redirect("/unauthorized");
  }

  return session;
}

// ============================================================================
// VALIDATION FUNCTIONS (NO REDIRECT)
// ============================================================================

/**
 * Check if user has a valid session (doesn't redirect)
 */
export async function hasSession(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

/**
 * Check if user is super admin (doesn't redirect)
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.isSuperAdmin ?? false;
}

/**
 * Check if user is admin (doesn't redirect)
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.isAdmin ?? false;
}

/**
 * Check if user has specific role (doesn't redirect)
 */
export async function hasRole(role: string): Promise<boolean> {
  const session = await getSession();
  return session?.user.role === role;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const Session = {
  // Core function
  getSession,

  // Require functions (with redirect)
  requireAuth,
  requireRole,
  requireSuperAdmin,
  requireAdmin,

  // Check functions (no redirect)
  hasSession,
  isSuperAdmin,
  isAdmin,
  hasRole,
} as const;
