// lib/auth/api.ts - Better Auth API Operations

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { handleAuthError, type AuthError } from "./utils";

// ============================================================================
// TYPES
// ============================================================================

export interface ApiResult<T = unknown> {
  data?: T;
  error?: AuthError;
}

type MemberRoleInput =
  | "OWNER"
  | "ADMIN"
  | "MEMBER"
  | "TEACHER"
  | "HEADTEACHER"
  | "ACCOUNTANT"
  | "STAFF"
  | "GUARDIAN"
  | "STUDENT";

type MemberRoleLowercase =
  | "owner"
  | "admin"
  | "member"
  | "teacher"
  | "headteacher"
  | "accountant"
  | "staff"
  | "guardian"
  | "student";

// ============================================================================
// ORGANIZATION OPERATIONS
// ============================================================================

/**
 * List all members of an organization
 */
export async function listOrganizationMembers(organizationId: string) {
  try {
    const data = await auth.api.listMembers({
      query: {
        organizationId,
        limit: 100,
        offset: 0,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
      headers: await headers(),
    });

    return { data };
  } catch (error) {
    console.error("[API] Error listing members:", error);
    return { error: handleAuthError(error) };
  }
}

/**
 * Add a member to an organization
 */
export async function addMemberToOrganization(
  organizationId: string,
  userId: string,
  role: MemberRoleInput,
): Promise<ApiResult> {
  try {
    const data = await auth.api.addMember({
      body: {
        organizationId,
        userId,
        role: role.toLowerCase() as MemberRoleLowercase,
      },
      headers: await headers(),
    });

    return { data };
  } catch (error) {
    console.error("[API] Error adding member:", error);
    return { error: handleAuthError(error) };
  }
}

/**
 * Remove a member from an organization
 */
export async function removeMemberFromOrganization(
  organizationId: string,
  memberIdOrEmail: string,
): Promise<ApiResult> {
  try {
    const data = await auth.api.removeMember({
      body: {
        organizationId,
        memberIdOrEmail,
      },
      headers: await headers(),
    });

    return { data };
  } catch (error) {
    console.error("[API] Error removing member:", error);
    return { error: handleAuthError(error) };
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  newRole: MemberRoleInput,
): Promise<ApiResult> {
  try {
    const data = await auth.api.updateMemberRole({
      body: {
        organizationId,
        memberId,
        role: newRole.toLowerCase() as MemberRoleLowercase,
      },
      headers: await headers(),
    });

    return { data };
  } catch (error) {
    console.error("[API] Error updating member role:", error);
    return { error: handleAuthError(error) };
  }
}

// ============================================================================
// INVITATION OPERATIONS
// ============================================================================

/**
 * Create an invitation
 */
export async function createInvitation(
  organizationId: string,
  email: string,
  role: MemberRoleInput,
): Promise<ApiResult> {
  try {
    const data = await auth.api.createInvitation({
      body: {
        organizationId,
        email,
        role: role.toLowerCase() as MemberRoleLowercase,
      },
      headers: await headers(),
    });

    return { data };
  } catch (error) {
    console.error("[API] Error creating invitation:", error);
    return { error: handleAuthError(error) };
  }
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(
  invitationId: string,
): Promise<ApiResult> {
  try {
    const data = await auth.api.cancelInvitation({
      body: { invitationId },
      headers: await headers(),
    });

    return { data };
  } catch (error) {
    console.error("[API] Error cancelling invitation:", error);
    return { error: handleAuthError(error) };
  }
}

/**
 * List all invitations for an organization
 */
export async function listInvitations(
  organizationId: string,
): Promise<ApiResult> {
  try {
    const data = await auth.api.listInvitations({
      query: { organizationId },
      headers: await headers(),
    });

    return { data };
  } catch (error) {
    console.error("[API] Error listing invitations:", error);
    return { error: handleAuthError(error) };
  }
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(
  invitationId: string,
): Promise<ApiResult> {
  try {
    const data = await auth.api.acceptInvitation({
      body: { invitationId },
      headers: await headers(),
    });

    return { data };
  } catch (error) {
    console.error("[API] Error accepting invitation:", error);
    return { error: handleAuthError(error) };
  }
}

/**
 * Reject an invitation
 */
export async function rejectInvitation(
  invitationId: string,
): Promise<ApiResult> {
  try {
    const data = await auth.api.rejectInvitation({
      body: { invitationId },
      headers: await headers(),
    });

    return { data };
  } catch (error) {
    console.error("[API] Error rejecting invitation:", error);
    return { error: handleAuthError(error) };
  }
}

// ============================================================================
// ORGANIZATION CREATION (SUPER ADMIN ONLY)
// ============================================================================

/**
 * Create organization (school) - Only super admins
 * Wrapper around Better Auth's createOrganization with validation
 */
export async function createOrganizationAsSuperAdmin(params: {
  userId: string;
  name: string;
  slug: string;
}): Promise<ApiResult> {
  const { userId, name, slug } = params;

  try {
    // Verify super admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== "superAdmin") {
      throw new Error("Super admin access required");
    }

    // Create organization via Better Auth
    const result = await auth.api.createOrganization({
      body: {
        name,
        slug,
        userId, // SuperAdmin will be added as OWNER automatically
      },
      headers: await headers(),
    });

    return { data: result };
  } catch (error) {
    console.error("[API] Error creating organization:", error);
    return { error: handleAuthError(error) };
  }
}

/**
 * Delete organization - Only super admins
 * Cascades to school and all related data
 */
export async function deleteOrganizationAsSuperAdmin(params: {
  userId: string;
  organizationId: string;
}): Promise<ApiResult> {
  const { userId, organizationId } = params;

  try {
    // Verify super admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== "superAdmin") {
      throw new Error("Super admin access required");
    }

    // Get organization with related data
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        school: true,
        members: true,
        invitations: true,
      },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete school if exists (cascades to most school data)
      if (organization.school) {
        await tx.school.delete({
          where: { id: organization.school.id },
        });
      }

      // 2. Delete invitations
      await tx.invitation.deleteMany({
        where: { organizationId },
      });

      // 3. Delete members
      await tx.member.deleteMany({
        where: { organizationId },
      });

      // 4. Delete organization
      await tx.organization.delete({
        where: { id: organizationId },
      });

      // 5. Log deletion
      await tx.auditLog.create({
        data: {
          userId,
          action: "DELETE",
          entityType: "ORGANIZATION",
          entityId: organizationId,
          oldValues: {
            name: organization.name,
            slug: organization.slug,
            schoolId: organization.school?.id,
          },
        },
      });
    });

    return { data: { success: true, organizationId } };
  } catch (error) {
    console.error("[API] Error deleting organization:", error);
    return { error: handleAuthError(error) };
  }
}

// ============================================================================
// SESSION OPERATIONS
// ============================================================================

/**
 * Set active organization for session
 */
export async function setActiveOrganization(
  organizationId: string,
): Promise<ApiResult> {
  try {
    await auth.api.setActiveOrganization({
      body: { organizationId },
      headers: await headers(),
    });

    console.log(`[API] Active organization set to: ${organizationId}`);
    return { data: { success: true } };
  } catch (error) {
    console.error("[API] Error setting active organization:", error);
    return { error: handleAuthError(error) };
  }
}

/**
 * Get active organization from session
 */
export async function getActiveOrganization() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.session.activeOrganizationId) {
      console.log("[API] No active organization in session");
      return { data: null };
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.session.activeOrganizationId },
      include: {
        school: true,
      },
    });

    return { data: organization };
  } catch (error) {
    console.error("[API] Error getting active organization:", error);
    return { error: handleAuthError(error) };
  }
}

// ============================================================================
// PERMISSION OPERATIONS
// ============================================================================

/**
 * Check if user has Better Auth permission
 * REFACTORED: Subscription-aware permission check
 */
export async function checkPermission(
  userId: string,
  permissions: Record<string, string[]>,
): Promise<boolean> {
  try {
    // 1. Get session to check subscription status
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // 2. If organization is suspended, restrict permissions
    if (session?.session.activeOrganizationId) {
       const org = await prisma.organization.findUnique({
         where: { id: session.session.activeOrganizationId },
         select: { subscriptionStatus: true }
       });

       if (org && org.subscriptionStatus !== "ACTIVE") {
          // If suspended, only allow 'organization:view', 'organization:update' (billing), 'school:view'
          const allowedResources = ["organization", "school"];
          const requestedResources = Object.keys(permissions);
          
          const isAllowed = requestedResources.every(res => allowedResources.includes(res));
          if (!isAllowed) return false;
       }
    }

    const result = await auth.api.userHasPermission({
      body: {
        userId,
        permissions,
      },
    });
    return !!result;
  } catch (error) {
    console.error("[API] Permission check error:", error);
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const AuthAPI = {
  // Organization operations
  listOrganizationMembers,
  addMemberToOrganization,
  removeMemberFromOrganization,
  updateMemberRole,

  // Invitation operations
  createInvitation,
  cancelInvitation,
  listInvitations,
  acceptInvitation,
  rejectInvitation,

  // Super admin operations
  createOrganizationAsSuperAdmin,
  deleteOrganizationAsSuperAdmin,

  // Session operations
  setActiveOrganization,
  getActiveOrganization,

  // Permission operations
  checkPermission,
} as const;
