// lib/services/invitation.service.ts - Invitation business logic
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth/config";
import { logger } from "@/lib/utils/logger";
import { headers } from "next/headers";

// ============================================================================
// TYPES
// ============================================================================

export interface CreateInvitationParams {
  organizationId: string;
  email: string;
  role: string;
  inviterId?: string;
}

export interface InvitationWithDetails {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  organizationId: string;
  organizationName: string;
  schoolName?: string;
  inviterName?: string;
  createdAt: Date;
}

// ============================================================================
// INVITATION OPERATIONS
// ============================================================================

/**
 * Create a new invitation using Better Auth
 * @param params - Invitation parameters
 * @returns Created invitation
 */
export async function createInvitation(params: CreateInvitationParams) {
  const { organizationId, email, role } = params;

  logger.info("Creating invitation", {
    organizationId,
    email,
    role,
  });

  try {
    // Validate that organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        school: {
          select: { name: true },
        },
      },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Check if user already exists and is a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { organizationId },
        },
      },
    });

    if (existingUser && existingUser.memberships.length > 0) {
      throw new Error("User is already a member of this organization");
    }

    // Check for pending invitations
    const pendingInvitation = await prisma.invitation.findFirst({
      where: {
        organizationId,
        email,
        status: "pending",
      },
    });

    if (pendingInvitation) {
      throw new Error("User already has a pending invitation");
    }

    // Create invitation via Better Auth
    const invitation = await auth.api.createInvitation({
      body: {
        organizationId,
        email,
        role: role.toLowerCase(), // Better Auth expects lowercase
      },
      headers: await headers(),
    });

    logger.info("Invitation created successfully", {
      invitationId: invitation.id,
      email,
      organizationId,
    });

    return invitation;
  } catch (error) {
    logger.error("Failed to create invitation", {
      organizationId,
      email,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * List invitations for an organization
 */
export async function listInvitations(
  organizationId: string,
): Promise<InvitationWithDetails[]> {
  logger.info("Listing invitations", { organizationId });

  try {
    // Get invitations via Better Auth
    const invitations = await auth.api.listInvitations({
      query: {
        organizationId,
      },
      headers: await headers(),
    });

    if (!invitations || invitations.length === 0) {
      return [];
    }

    // Enrich with organization and inviter details
    const enrichedInvitations = await Promise.all(
      invitations.map(async (invitation) => {
        const org = await prisma.organization.findUnique({
          where: { id: invitation.organizationId },
          include: {
            school: {
              select: { name: true },
            },
          },
        });

        const inviter = await prisma.user.findUnique({
          where: { id: invitation.inviterId },
          select: {
            name: true,
            email: true,
          },
        });

        return {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          organizationId: invitation.organizationId,
          organizationName: org?.name || "Unknown",
          schoolName: org?.school?.name,
          inviterName: inviter?.name || inviter?.email || "Unknown",
          createdAt: invitation.createdAt,
        };
      }),
    );

    return enrichedInvitations;
  } catch (error) {
    logger.error("Failed to list invitations", {
      organizationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Get a single invitation by ID with details
 */
export async function getInvitation(
  invitationId: string,
): Promise<InvitationWithDetails | null> {
  logger.info("Getting invitation", { invitationId });

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: {
          include: {
            school: {
              select: { name: true },
            },
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return null;
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationId: invitation.organizationId,
      organizationName: invitation.organization.name,
      schoolName: invitation.organization.school?.name,
      inviterName:
        invitation.inviter.name || invitation.inviter.email || "Unknown",
      createdAt: invitation.createdAt,
    };
  } catch (error) {
    logger.error("Failed to get invitation", {
      invitationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: string) {
  logger.info("Cancelling invitation", { invitationId });

  try {
    await auth.api.cancelInvitation({
      body: { invitationId },
      headers: await headers(),
    });

    logger.info("Invitation cancelled successfully", { invitationId });
  } catch (error) {
    logger.error("Failed to cancel invitation", {
      invitationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Check if an invitation is still valid
 */
export async function isInvitationValid(
  invitationId: string,
): Promise<boolean> {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: {
        status: true,
        expiresAt: true,
      },
    });

    if (!invitation) {
      return false;
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      return false;
    }

    // Check if still pending
    if (invitation.status !== "pending") {
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Failed to check invitation validity", {
      invitationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Resend an invitation (cancel old one and create new)
 */
export async function resendInvitation(invitationId: string) {
  logger.info("Resending invitation", { invitationId });

  try {
    // Get original invitation details
    const originalInvitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!originalInvitation) {
      throw new Error("Invitation not found");
    }

    // Cancel the old invitation
    await cancelInvitation(invitationId);

    // Create a new invitation with the same details
    const newInvitation = await createInvitation({
      organizationId: originalInvitation.organizationId,
      email: originalInvitation.email,
      role: originalInvitation.role,
    });

    logger.info("Invitation resent successfully", {
      oldInvitationId: invitationId,
      newInvitationId: newInvitation.id,
    });

    return newInvitation;
  } catch (error) {
    logger.error("Failed to resend invitation", {
      invitationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Get pending invitations for an email
 */
export async function getPendingInvitationsForEmail(email: string) {
  return prisma.invitation.findMany({
    where: {
      email: email.toLowerCase(),
      status: "pending",
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      organization: {
        include: {
          school: {
            select: { name: true },
          },
        },
      },
      inviter: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
