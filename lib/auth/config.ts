// lib/auth/config.ts - REFACTORED with all fixes
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin } from "better-auth/plugins";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import {
  ac,
  superAdmin,
  owner,
  admin as adminRole,
  teacher,
  accountant,
  student,
  guardian,
  user as userRole,
} from "@/lib/auth/permissions";
import {
  sendInvitationEmail,
  sendPasswordResetEmail,
} from "@/lib/email/resend";
import { createAuditLog } from "@/lib/services/audit.service";
import { createUserProfile } from "@/lib/services/user.service";
import { Gender } from "@/lib/generated/prisma/client";
import { logger } from "@/lib/utils/logger";

// ============================================================================
// BETTER AUTH CONFIGURATION
// ============================================================================

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // ============================================================================
  // EMAIL & PASSWORD CONFIGURATION
  // ============================================================================
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,

    // Password reset configuration
    sendResetPassword: async ({ user, url, token }, request) => {
      logger.info("Sending password reset email", {
        userId: user.id,
        email: user.email,
      });

      try {
        await sendPasswordResetEmail({
          to: user.email,
          userName: user.name,
          resetUrl: url,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        });

        logger.info("Password reset email sent successfully", {
          userId: user.id,
        });
      } catch (error) {
        logger.error("Failed to send password reset email", {
          userId: user.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // Don't throw - we don't want to reveal if email exists
      }
    },

    // Hook after successful password reset
    onPasswordReset: async ({ user }, request) => {
      logger.info("Password reset completed", { userId: user.id });

      try {
        await createAuditLog({
          userId: user.id,
          action: "UPDATE",
          entityType: "USER_PASSWORD",
          entityId: user.id,
          newValues: {
            passwordResetAt: new Date(),
          },
        });
      } catch (error) {
        logger.error("Failed to create audit log for password reset", {
          userId: user.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },

    // Token expiration time (in seconds)
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  },

  // ============================================================================
  // PLUGINS
  // ============================================================================
  plugins: [
    // ------------------------------------------------------------------------
    // ORGANIZATION PLUGIN
    // ------------------------------------------------------------------------
    organization({
      // Only super admins can create organizations
      allowUserToCreateOrganization: async (user) => {
        return user.role === "superAdmin";
      },

      // Organization limit per platform
      organizationLimit: 1000,

      // Send invitation email when invitation is created
      async sendInvitationEmail(data) {
        const { email, id, organization, inviter } = data;

        logger.info("Sending invitation email", {
          invitationId: id,
          email,
          organizationId: organization.id,
        });

        try {
          // Get full organization details
          const org = await prisma.organization.findUnique({
            where: { id: organization.id },
            include: {
              school: {
                select: { name: true },
              },
            },
          });

          if (!org) {
            logger.error("Organization not found for invitation", {
              organizationId: organization.id,
            });
            return;
          }

          // Get invitation details
          const invitation = await prisma.invitation.findUnique({
            where: { id },
            select: {
              role: true,
              expiresAt: true,
            },
          });

          if (!invitation) {
            logger.error("Invitation not found", { invitationId: id });
            return;
          }

          // Get inviter details
          const inviterUser = await prisma.user.findUnique({
            where: { id: inviter.id },
            select: {
              name: true,
              email: true,
            },
          });

          // Send email
          await sendInvitationEmail({
            to: email,
            inviterName:
              inviterUser?.name || inviterUser?.email || "Administrator",
            schoolName: org.school?.name || org.name,
            role: invitation.role,
            invitationId: id,
            expiresAt: invitation.expiresAt,
          });

          logger.info("Invitation email sent successfully", {
            invitationId: id,
            email,
          });
        } catch (error) {
          logger.error("Failed to send invitation email", {
            invitationId: id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },

      // Organization lifecycle hooks
      organizationHooks: {
        // After a member is added to organization
        afterAddMember: async ({ user, organization, member }) => {
          logger.info("Member added to organization", {
            userId: user.id,
            organizationId: organization.id,
            role: member.role,
          });

          try {
            // Create user profile if it doesn't exist
            await createUserProfile(user.id, user.name);

            // Mark email as verified
            const currentUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { emailVerified: true },
            });

            if (!currentUser?.emailVerified) {
              await prisma.user.update({
                where: { id: user.id },
                data: { emailVerified: true },
              });
              logger.info("Email verified for user", { userId: user.id });
            }

            // Create audit log
            await createAuditLog({
              userId: user.id,
              action: "CREATE",
              entityType: "MEMBER",
              entityId: member.id,
              newValues: {
                organizationId: organization.id,
                organizationName: organization.name,
                role: member.role,
              },
            });
          } catch (error) {
            logger.error("Error in afterAddMember hook", {
              userId: user.id,
              error: error instanceof Error ? error.message : "Unknown error",
            });
            // Don't throw - we don't want to fail member addition
          }
        },

        // Before removing a member
        beforeRemoveMember: async ({ user, organization }) => {
          logger.info("Preparing to remove member", {
            userId: user.id,
            organizationId: organization.id,
          });

          try {
            // Check if this is their last organization
            const memberCount = await prisma.member.count({
              where: { userId: user.id },
            });

            if (memberCount === 1) {
              logger.warn("User will have no organizations after removal", {
                userId: user.id,
              });
            }
          } catch (error) {
            logger.error("Error in beforeRemoveMember hook", {
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        },

        // After removing a member
        afterRemoveMember: async ({ member, user, organization }) => {
          logger.info("Member removed from organization", {
            userId: user.id,
            organizationId: organization.id,
          });

          try {
            await createAuditLog({
              userId: user.id,
              action: "DELETE",
              entityType: "MEMBER",
              entityId: member.id,
              oldValues: {
                organizationId: organization.id,
                organizationName: organization.name,
                role: member.role,
              },
            });
          } catch (error) {
            logger.error("Error in afterRemoveMember hook", {
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        },

        // After accepting an invitation
        afterAcceptInvitation: async ({ invitation, user, organization }) => {
          logger.info("Invitation accepted", {
            userId: user.id,
            organizationId: organization.id,
            invitationId: invitation.id,
          });

          try {
            await createAuditLog({
              userId: user.id,
              action: "CREATE",
              entityType: "INVITATION_ACCEPTANCE",
              entityId: invitation.id,
              newValues: {
                email: invitation.email,
                organizationId: organization.id,
                organizationName: organization.name,
                role: invitation.role,
              },
            });
          } catch (error) {
            logger.error("Error in afterAcceptInvitation hook", {
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        },

        // After cancelling an invitation
        afterCancelInvitation: async ({
          invitation,
          cancelledBy,
          organization,
        }) => {
          logger.info("Invitation cancelled", {
            invitationId: invitation.id,
            cancelledBy: cancelledBy.id,
          });

          try {
            await createAuditLog({
              userId: cancelledBy.id,
              action: "DELETE",
              entityType: "INVITATION",
              entityId: invitation.id,
              oldValues: {
                email: invitation.email,
                organizationId: organization.id,
                organizationName: organization.name,
                role: invitation.role,
              },
            });
          } catch (error) {
            logger.error("Error in afterCancelInvitation hook", {
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        },
      },
    }),

    // ------------------------------------------------------------------------
    // ADMIN PLUGIN
    // ------------------------------------------------------------------------
    admin({
      ac,
      roles: {
        superAdmin,
        owner,
        admin: adminRole,
        teacher,
        accountant,
        student,
        guardian,
        user: userRole,
      },

      // Impersonation settings
      impersonationSessionDuration: 60 * 60 * 2, // 2 hours

      // Impersonation permission check
      async canImpersonate(opts: {
        user: { id: string; role?: string };
        targetUser: { id: string };
      }) {
        const { user, targetUser } = opts;

        // Super admins can impersonate anyone
        if (user.role === "superAdmin") {
          return true;
        }

        // Owners and admins can impersonate users in their organizations
        if (user.role === "owner" || user.role === "admin") {
          const userOrgs = await prisma.member.findMany({
            where: {
              userId: user.id,
              role: { in: ["owner", "admin"] },
            },
            select: { organizationId: true },
          });

          const targetOrgs = await prisma.member.findMany({
            where: { userId: targetUser.id },
            select: { organizationId: true },
          });

          return userOrgs.some((userOrg) =>
            targetOrgs.some(
              (targetOrg) =>
                targetOrg.organizationId === userOrg.organizationId,
            ),
          );
        }

        return false;
      },
    }),
  ],

  // ============================================================================
  // SESSION CONFIGURATION
  // ============================================================================
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // Cache session for 5 minutes
    },
  },

  // ============================================================================
  // ADVANCED SETTINGS
  // ============================================================================
  advanced: {
    // Use secure cookies in production
    useSecureCookies: process.env.NODE_ENV === "production",

    // Cookie domain (for subdomains)
    cookieDomain: process.env.COOKIE_DOMAIN,

    // Default redirect after sign in
    defaultRedirect: "/dashboard",
  },
});

// ============================================================================
// SESSION HELPERS
// ============================================================================

/**
 * Get the current authenticated session with profile and memberships
 */
export async function getAuthSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  // Get user profile with related data
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      student: {
        include: {
          school: {
            select: {
              id: true,
              name: true,
              code: true,
              subdomain: true,
              organizationId: true,
            },
          },
        },
      },
      teacher: {
        include: {
          school: {
            select: {
              id: true,
              name: true,
              code: true,
              subdomain: true,
              organizationId: true,
            },
          },
        },
      },
      staff: {
        include: {
          school: {
            select: {
              id: true,
              name: true,
              code: true,
              subdomain: true,
              organizationId: true,
            },
          },
        },
      },
      guardian: {
        include: {
          school: {
            select: {
              id: true,
              name: true,
              code: true,
              subdomain: true,
              organizationId: true,
            },
          },
        },
      },
    },
  });

  // Get user's organization memberships
  const memberships = await prisma.member.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          school: {
            select: {
              id: true,
              name: true,
              code: true,
              subdomain: true,
            },
          },
        },
      },
    },
  });

  return {
    ...session,
    profile,
    memberships,
    isSuperAdmin: session.user.role === "superAdmin",
    isOwner: memberships.some((m) => m.role === "owner"),
    isAdmin:
      session.user.role === "superAdmin" ||
      memberships.some((m) => m.role === "owner" || m.role === "admin"),
  };
}

/**
 * Check if a user has specific permissions
 */
export async function checkPermission(
  userId: string,
  permissions: Record<string, string[]>,
) {
  const result = await auth.api.userHasPermission({
    body: {
      userId,
      permissions,
    },
  });
  return result;
}

/**
 * Check if the current user has specific permissions
 */
export async function checkCurrentUserPermission(
  permissions: Record<string, string[]>,
) {
  const session = await getAuthSession();
  if (!session) return false;
  return checkPermission(session.user.id, permissions);
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth() {
  const session = await getAuthSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Require specific role - throws error if user doesn't have role
 */
export async function requireRole(roles: string | string[]) {
  const session = await requireAuth();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  const userRoles = [
    session.user.role,
    ...session.memberships.map((m) => m.role),
  ];

  const hasRole = allowedRoles.some((role) => userRoles.includes(role));

  if (!hasRole) {
    throw new Error("Forbidden");
  }

  return session;
}

export type AuthSession = Awaited<ReturnType<typeof getAuthSession>>;
