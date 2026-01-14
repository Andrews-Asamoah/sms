// lib/auth/helpers.ts - Better Auth API Helpers
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

    return data;
  } catch (error) {
    console.error("Error listing members:", error);
    return null;
  }
}

/**
 * Add a member to an organization
 */
export async function addMemberToOrganization(
  organizationId: string,
  userId: string,
  role: "OWNER" | "ADMIN" | "MEMBER"
) {
  try {
    const data = await auth.api.addMember({
      body: {
        organizationId,
        userId,
        role: role.toLowerCase() as "owner" | "admin" | "member",
      },
      headers: await headers(),
    });

    return data;
  } catch (error) {
    console.error("Error adding member:", error);
    return null;
  }
}

/**
 * Remove a member from an organization
 */
export async function removeMemberFromOrganization(
  organizationId: string,
  memberIdOrEmail: string
) {
  try {
    const data = await auth.api.removeMember({
      body: {
        organizationId,
        memberIdOrEmail,
      },
      headers: await headers(),
    });

    return data;
  } catch (error) {
    console.error("Error removing member:", error);
    return null;
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  newRole: "OWNER" | "ADMIN" | "MEMBER"
) {
  try {
    const data = await auth.api.updateMemberRole({
      body: {
        organizationId,
        memberId,
        role: newRole.toLowerCase() as "owner" | "admin" | "member",
      },
      headers: await headers(),
    });

    return data;
  } catch (error) {
    console.error("Error updating member role:", error);
    return null;
  }
}

/**
 * Create an invitation
 */
export async function createInvitation(
  organizationId: string,
  email: string,
  role: "OWNER" | "ADMIN" | "MEMBER"
) {
  try {
    const data = await auth.api.createInvitation({
      body: {
        organizationId,
        email,
        role: role.toLowerCase() as "owner" | "admin" | "member",
      },
      headers: await headers(),
    });

    return data;
  } catch (error) {
    console.error("Error creating invitation:", error);
    return null;
  }
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: string) {
  try {
    const data = await auth.api.cancelInvitation({
      body: {
        invitationId,
      },
      headers: await headers(),
    });

    return data;
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return null;
  }
}

/**
 * List all invitations for an organization
 */
export async function listInvitations(organizationId: string) {
  try {
    const data = await auth.api.listInvitations({
      query: {
        organizationId,
      },
      headers: await headers(),
    });

    return data;
  } catch (error) {
    console.error("Error listing invitations:", error);
    return null;
  }
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(invitationId: string) {
  try {
    const data = await auth.api.acceptInvitation({
      body: {
        invitationId,
      },
      headers: await headers(),
    });

    return data;
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return null;
  }
}

/**
 * Reject an invitation
 */
export async function rejectInvitation(invitationId: string) {
  try {
    const data = await auth.api.rejectInvitation({
      body: {
        invitationId,
      },
      headers: await headers(),
    });

    return data;
  } catch (error) {
    console.error("Error rejecting invitation:", error);
    return null;
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Error handler for Better Auth errors
 */
export function handleAuthError(error: unknown): {
  message: string;
  status: number;
  code?: string;
} {
  if (error instanceof Error) {
    // Check for specific Better Auth error patterns
    if (error.message.includes("not allowed to create organization")) {
      return {
        message: "You don't have permission to create organizations",
        status: 403,
        code: "FORBIDDEN",
      };
    }

    if (error.message.includes("not authenticated")) {
      return {
        message: "You must be logged in to perform this action",
        status: 401,
        code: "UNAUTHORIZED",
      };
    }

    if (error.message.includes("organization not found")) {
      return {
        message: "Organization not found",
        status: 404,
        code: "NOT_FOUND",
      };
    }

    if (error.message.includes("already exists")) {
      return {
        message: "Resource already exists",
        status: 409,
        code: "CONFLICT",
      };
    }

    // Generic error
    return {
      message: error.message,
      status: 500,
      code: "INTERNAL_ERROR",
    };
  }

  return {
    message: "An unknown error occurred",
    status: 500,
    code: "UNKNOWN_ERROR",
  };
}

/**
 * Validate organization slug format
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9-]+$/;
  return (
    slugRegex.test(slug) &&
    !slug.startsWith("-") &&
    !slug.endsWith("-") &&
    slug.length >= 3 &&
    slug.length <= 20
  );
}

/**
 * Generate a slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 20);
}

/**
 * Generate a school code from name
 */
export function generateSchoolCode(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 10);
}
