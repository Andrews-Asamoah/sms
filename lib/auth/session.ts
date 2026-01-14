// lib/auth/session.ts - UPDATED to use your Better Auth setup
import { cache } from "react";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Your Better Auth instance
import type { ExtendedSession } from "./types";
import { profileInclude, membershipInclude } from "./types";

/**
 * Get enhanced session with profile and memberships
 * Cached per request
 */
export const getEnhancedSession = cache(
  async (): Promise<ExtendedSession | null> => {
    try {
      // Get Better Auth session (from your auth.ts)
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session) {
        console.log("No Better Auth session found");
        return null;
      }

      console.log(`Session found for user: ${session.user.email}`);

      // Fetch profile with all relations using your defined include
      const profile = await prisma.userProfile.findUnique({
        where: { userId: session.user.id },
        include: profileInclude,
      });

      // Fetch memberships using your defined include
      const memberships = await prisma.member.findMany({
        where: { userId: session.user.id },
        include: membershipInclude,
      });

      console.log(`Found ${memberships.length} organization memberships`);
      console.log(`Profile exists: ${!!profile}`);

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
      };

      return enhancedSession;
    } catch (error) {
      console.error("Error getting enhanced session:", error);
      return null;
    }
  }
);

/**
 * Require authenticated session or throw
 */
export async function requireAuth(): Promise<ExtendedSession> {
  const session = await getEnhancedSession();

  if (!session) {
    throw new Error("Unauthorized - No session found");
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
 * Set active organization for session
 * Uses Better Auth's organization plugin
 */
export async function setActiveOrganization(
  organizationId: string
): Promise<void> {
  try {
    await auth.api.setActiveOrganization({
      body: { organizationId },
      headers: await headers(),
    });
    console.log(`Active organization set to: ${organizationId}`);
  } catch (error) {
    console.error("Error setting active organization:", error);
    throw error;
  }
}

/**
 * Get active organization from session
 */
export async function getActiveOrganization() {
  const session = await getEnhancedSession();

  if (!session?.session.activeOrganizationId) {
    console.log("No active organization in session");
    return null;
  }

  return await prisma.organization.findUnique({
    where: { id: session.session.activeOrganizationId },
    include: {
      school: true,
    },
  });
}

/**
 * Check if user has Better Auth permission
 * Uses your permission system from lib/permissions.ts
 */
export async function hasPermission(
  userId: string,
  permissions: Record<string, string[]>
): Promise<boolean> {
  try {
    const result = await auth.api.userHasPermission({
      body: {
        userId,
        permissions,
      },
    });
    return !!result;
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}

/**
 * Check current user's permission
 */
export async function checkCurrentUserPermission(
  permissions: Record<string, string[]>
): Promise<boolean> {
  const session = await getEnhancedSession();
  if (!session) return false;
  return hasPermission(session.user.id, permissions);
}
