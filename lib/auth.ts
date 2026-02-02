/**
 * ============================================================================
 * BETTER AUTH CONFIGURATION
 * School Management System - Multi-tenant with Organization Plugin
 * ============================================================================
 *
 * Key Concepts:
 *
 * 1. USER ROLES (system-wide):
 *    - superAdmin: Can create/delete organizations, full system access
 *    - user: Default role for all other users
 *
 * 2. ORGANIZATION ROLES (per-school):
 *    - owner: Full control within their school (auto-assigned to creator)
 *    - admin: School administrator
 *    - member: Regular member (teacher, staff, etc.)
 *
 * 3. PROFILE ROLES (functional roles within a school):
 *    - teacher, student, guardian, accountant, staff
 *    - These are determined by UserProfile relationships
 *
 * Flow:
 * 1. SuperAdmin creates Organization → becomes owner
 * 2. Owner invites admin → admin accepts → becomes organization admin
 * 3. Admin creates teacher/student profiles → they become organization members
 *
 * ============================================================================
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin } from "better-auth/plugins";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import {
  ac,
  superAdmin,
  admin as adminRole,
  teacher,
  accountant,
  student,
  guardian,
  user as userRole,
} from "@/lib/permissions";
import {
  sendAdminInvitationEmail,
  sendPasswordResetEmail,
} from "@/lib/email/resend";
import { Gender } from "@/lib/generated/prisma/client";

// ============================================================================
// BETTER AUTH INSTANCE
// ============================================================================

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // ==========================================================================
  // EMAIL & PASSWORD AUTHENTICATION
  // ==========================================================================
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,

    // Password Reset Configuration
    sendResetPassword: async ({ user, url }) => {
      console.log(`📧 [Auth] Sending password reset email to ${user.email}`);

      try {
        await sendPasswordResetEmail({
          to: user.email,
          userName: user.name,
          resetUrl: url, // Better Auth provides complete URL with token
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        });

        console.log(`✅ [Auth] Password reset email sent to ${user.email}`);
      } catch (error) {
        console.error("[Auth] Error sending password reset email:", error);
        // Don't throw - we don't want to reveal if email exists
      }
    },

    // Post-reset hook for audit logging
    onPasswordReset: async ({ user }) => {
      console.log(`✅ [Auth] Password reset completed for ${user.email}`);

      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "UPDATE",
            entityType: "USER_PASSWORD",
            entityId: user.id,
            newValues: {
              passwordResetAt: new Date().toISOString(),
            },
          },
        });

        console.log(`✅ [Auth] Audit log created for password reset`);
      } catch (error) {
        console.error("[Auth] Error creating audit log:", error);
      }
    },

    // Token expiration: 1 hour
    resetPasswordTokenExpiresIn: 60 * 60,
  },

  // ==========================================================================
  // PLUGINS
  // ==========================================================================
  plugins: [
    // ------------------------------------------------------------------------
    // ORGANIZATION PLUGIN
    // ------------------------------------------------------------------------
    organization({
      // Only SuperAdmins can create organizations (schools)
      allowUserToCreateOrganization: async (user) => {
        const isSuperAdmin = user.role === "superAdmin";

        if (isSuperAdmin) {
          console.log(
            `✓ [Auth] SuperAdmin ${user.email} can create organization`,
          );
        } else {
          console.log(
            `✗ [Auth] User ${user.email} cannot create organization (not SuperAdmin)`,
          );
        }

        return isSuperAdmin;
      },

      // Maximum organizations in the system
      organizationLimit: 100,

      // Email invitation handler
      async sendInvitationEmail(data) {
        const { email, id, organization, inviter } = data;

        try {
          console.log(`📧 [Auth] Sending invitation email to ${email}`);

          // Get full organization details with school
          const org = await prisma.organization.findUnique({
            where: { id: organization.id },
            include: {
              school: {
                select: {
                  name: true,
                },
              },
            },
          });

          if (!org) {
            console.error("[Auth] Organization not found for invitation");
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
            console.error("[Auth] Invitation not found");
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

          // Send invitation email
          await sendAdminInvitationEmail({
            to: email,
            inviterName:
              inviterUser?.name || inviterUser?.email || "Administrator",
            schoolName: org.school?.name || org.name,
            role: invitation.role || "member",
            invitationId: id,
            expiresAt: invitation.expiresAt,
          });

          console.log(`✅ [Auth] Invitation email sent to ${email}`);
        } catch (error) {
          console.error("[Auth] Error in sendInvitationEmail:", error);
        }
      },

      // ------------------------------------------------------------------------
      // ORGANIZATION HOOKS
      // ------------------------------------------------------------------------
      organizationHooks: {
        /**
         * After member is added to organization
         * Creates UserProfile if needed and marks email as verified
         */
        afterAddMember: async ({ user, organization, member }) => {
          console.log(
            `✅ [Auth] Member added: ${user.email} to ${organization.name} as ${member.role}`,
          );

          try {
            // Create UserProfile if it doesn't exist
            const existingProfile = await prisma.userProfile.findUnique({
              where: { userId: user.id },
            });

            if (!existingProfile) {
              console.log(`📝 [Auth] Creating user profile for ${user.email}`);

              const nameParts = user.name.trim().split(/\s+/);
              const firstName = nameParts[0] || "User";
              const lastName =
                nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

              await prisma.userProfile.create({
                data: {
                  userId: user.id,
                  firstName,
                  lastName: lastName || "Profile",
                  phone: null,
                  gender: Gender.OTHER,
                  dateOfBirth: new Date("2000-01-01"),
                  isActive: true,
                },
              });

              console.log(`✅ [Auth] Profile created for ${user.email}`);
            }

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
              console.log(`✅ [Auth] Email verified for ${user.email}`);
            }

            // Create audit log
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                action: "CREATE",
                entityType: "MEMBER",
                entityId: member.id,
                newValues: {
                  organizationId: organization.id,
                  organizationName: organization.name,
                  role: member.role,
                  addedAt: new Date().toISOString(),
                },
              },
            });

            console.log(`✅ [Auth] Audit log created for member addition`);
          } catch (error) {
            console.error("[Auth] Error in afterAddMember:", error);
            // Don't throw - we don't want to fail the member addition
          }
        },

        /**
         * Before member is removed from organization
         * Warning if this is their last organization
         */
        beforeRemoveMember: async ({ user, organization }) => {
          console.log(
            `🗑️ [Auth] Preparing to remove ${user.email} from ${organization.name}`,
          );

          try {
            const memberCount = await prisma.member.count({
              where: { userId: user.id },
            });

            if (memberCount === 1) {
              console.warn(
                `⚠️ [Auth] ${user.email} will have no organizations after removal`,
              );
            }
          } catch (error) {
            console.error("[Auth] Error in beforeRemoveMember:", error);
          }
        },

        /**
         * After member is removed from organization
         * Creates audit log for accountability
         */
        afterRemoveMember: async ({ member, user, organization }) => {
          console.log(
            `✅ [Auth] Member removed: ${user.email} from ${organization.name}`,
          );

          try {
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                action: "DELETE",
                entityType: "MEMBER",
                entityId: member.id,
                oldValues: {
                  organizationId: organization.id,
                  organizationName: organization.name,
                  role: member.role,
                  removedAt: new Date().toISOString(),
                },
              },
            });

            console.log(`✅ [Auth] Audit log created for member removal`);
          } catch (error) {
            console.error("[Auth] Error in afterRemoveMember:", error);
          }
        },

        /**
         * After invitation is accepted
         * Logs the acceptance for audit trail
         */
        afterAcceptInvitation: async ({ invitation, user, organization }) => {
          console.log(`✅ [Auth] Invitation accepted by ${user.email}`);

          try {
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                action: "CREATE",
                entityType: "INVITATION_ACCEPTANCE",
                entityId: invitation.id,
                newValues: {
                  email: invitation.email,
                  organizationId: organization.id,
                  organizationName: organization.name,
                  role: invitation.role,
                  acceptedAt: new Date().toISOString(),
                },
              },
            });
          } catch (error) {
            console.error("[Auth] Error in afterAcceptInvitation:", error);
          }
        },

        /**
         * After invitation is cancelled
         * Logs the cancellation
         */
        afterCancelInvitation: async ({
          invitation,
          cancelledBy,
          organization,
        }) => {
          console.log(`🚫 [Auth] Invitation cancelled for ${invitation.email}`);

          try {
            await prisma.auditLog.create({
              data: {
                userId: cancelledBy.id,
                action: "DELETE",
                entityType: "INVITATION",
                entityId: invitation.id,
                oldValues: {
                  email: invitation.email,
                  organizationId: organization.id,
                  organizationName: organization.name,
                  role: invitation.role,
                  cancelledAt: new Date().toISOString(),
                },
              },
            });
          } catch (error) {
            console.error("[Auth] Error in afterCancelInvitation:", error);
          }
        },
      },
    }),

    // ------------------------------------------------------------------------
    // ADMIN PLUGIN (for permissions and impersonation)
    // ------------------------------------------------------------------------
    admin({
      ac,
      roles: {
        superAdmin,
        admin: adminRole,
        teacher,
        accountant,
        student,
        guardian,
        user: userRole,
      },

      // Impersonation session duration: 2 hours
      impersonationSessionDuration: 60 * 60 * 2,

      /**
       * Determine who can impersonate whom
       * - SuperAdmins can impersonate anyone
       * - Admins can impersonate users in their organizations
       */
      async canImpersonate(opts: {
        user: { id: string; role?: string };
        targetUser: { id: string };
      }) {
        const { user, targetUser } = opts;

        // SuperAdmin can impersonate anyone
        if (user.role === "superAdmin") {
          return true;
        }

        // Organization admin can impersonate users in their organizations
        if (user.role === "admin") {
          const adminMemberships = await prisma.member.findMany({
            where: {
              userId: user.id,
              role: "admin",
            },
            select: { organizationId: true },
          });

          const targetMemberships = await prisma.member.findMany({
            where: { userId: targetUser.id },
            select: { organizationId: true },
          });

          // Check if they share any organization where user is admin
          return adminMemberships.some((admin) =>
            targetMemberships.some(
              (target) => target.organizationId === admin.organizationId,
            ),
          );
        }

        return false;
      },
    }),
  ],

  // ==========================================================================
  // SESSION CONFIGURATION
  // ==========================================================================
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get extended session with profile and organization data
 * This is the main session function used throughout the app
 */
export async function getAuthSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  // Get user profile with all school relationships
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

  // Get organization memberships
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
    isAdmin:
      session.user.role === "admin" || session.user.role === "superAdmin",
  };
}

/**
 * Check if user has specific permission
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
 * Check if current user has specific permission
 */
export async function checkCurrentUserPermission(
  permissions: Record<string, string[]>,
) {
  const session = await getAuthSession();
  if (!session) return false;
  return checkPermission(session.user.id, permissions);
}
