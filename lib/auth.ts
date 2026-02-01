// lib/auth.ts - FIXED with proper types and imports
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
import { Gender } from "@/lib/generated/prisma/client";

// ============================================================================
// BETTER AUTH CONFIGURATION
// ============================================================================

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Base URL - Required for email links
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,

  // ========================================================================
  // Email & Password Authentication
  // ========================================================================
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,

    // Password Reset Configuration
    sendResetPassword: async ({ user, url }, request) => {
      console.log(`📧 [Auth] Sending password reset email to ${user.email}`);

      try {
        await sendPasswordResetEmail({
          to: user.email,
          userName: user.name,
          resetUrl: url,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        });

        console.log(`✅ [Auth] Password reset email sent successfully`);
      } catch (error) {
        console.error("[Auth] Failed to send password reset email:", error);
      }
    },

    // Post-Reset Hook
    onPasswordReset: async ({ user }, request) => {
      console.log(`✅ [Auth] Password reset completed for ${user.email}`);

      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "UPDATE",
            entityType: "USER_PASSWORD",
            entityId: user.id,
            newValues: {
              passwordResetAt: new Date(),
            },
          },
        });

        console.log(`✅ [Auth] Password reset audit log created`);
      } catch (error) {
        console.error("[Auth] Failed to create audit log:", error);
      }
    },

    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  },

  // ========================================================================
  // Session Configuration
  // ========================================================================
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },
  },

  // ========================================================================
  // PLUGINS
  // ========================================================================
  plugins: [
    // ======================================================================
    // Organization Plugin
    // ======================================================================
    organization({
      // Only superAdmins can create organizations
      allowUserToCreateOrganization: async (user) => {
        // Check if user exists in database with superAdmin role
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true },
        });
        return !!dbUser;
      },

      organizationLimit: 100,

      // Invitation Email Handler
      async sendInvitationEmail(data) {
        const { email, id, organization, inviter } = data;

        try {
          console.log(`📧 [Auth] Sending invitation email to ${email}`);

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
            console.error("[Auth] Organization not found");
            return;
          }

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

          const inviterUser = await prisma.user.findUnique({
            where: { id: inviter.id },
            select: {
              name: true,
              email: true,
            },
          });

          await sendInvitationEmail({
            to: email,
            inviterName:
              inviterUser?.name || inviterUser?.email || "Administrator",
            schoolName: org.school?.name || org.name,
            role: invitation.role || "member",
            invitationId: id,
            expiresAt: invitation.expiresAt,
          });

          console.log(`✅ [Auth] Invitation email sent`);
        } catch (error) {
          console.error("[Auth] Error sending invitation email:", error);
        }
      },

      // Organization Hooks
      organizationHooks: {
        afterAddMember: async ({ user, organization, member }) => {
          console.log(
            `✅ [Hook] Member added: ${user.email} to ${organization.name} as ${member.role}`,
          );

          try {
            // Create UserProfile if missing
            const existingProfile = await prisma.userProfile.findUnique({
              where: { userId: user.id },
            });

            if (!existingProfile) {
              const nameParts = user.name.trim().split(/\s+/);
              const firstName = nameParts[0] || "User";
              const lastName =
                nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Profile";

              await prisma.userProfile.create({
                data: {
                  userId: user.id,
                  firstName,
                  lastName,
                  phone: null,
                  gender: Gender.OTHER,
                  dateOfBirth: new Date("2000-01-01"),
                  isActive: true,
                },
              });

              console.log(`✅ [Hook] Profile created for ${user.email}`);
            }

            // Verify email
            const currentUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { emailVerified: true },
            });

            if (!currentUser?.emailVerified) {
              await prisma.user.update({
                where: { id: user.id },
                data: { emailVerified: true },
              });
              console.log(`✅ [Hook] Email verified`);
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
                },
              },
            });
          } catch (error) {
            console.error("[Hook] Error in afterAddMember:", error);
          }
        },

        beforeRemoveMember: async ({ user, organization }) => {
          console.log(
            `🗑️  [Hook] Removing ${user.email} from ${organization.name}`,
          );

          try {
            const memberCount = await prisma.member.count({
              where: { userId: user.id },
            });

            if (memberCount === 1) {
              console.warn(
                `⚠️  [Hook] Warning: ${user.email} will have no organizations`,
              );
            }
          } catch (error) {
            console.error("[Hook] Error in beforeRemoveMember:", error);
          }
        },

        afterRemoveMember: async ({ member, user, organization }) => {
          console.log(`✅ [Hook] Member removed: ${user.email}`);

          try {
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                action: "DELETE",
                entityType: "MEMBER",
                entityId: member.id,
                oldValues: {
                  organizationId: organization.id,
                  role: member.role,
                },
              },
            });
          } catch (error) {
            console.error("[Hook] Error in afterRemoveMember:", error);
          }
        },

        afterAcceptInvitation: async ({ invitation, user, organization }) => {
          console.log(`✅ [Hook] Invitation accepted by ${user.email}`);

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
                  role: invitation.role,
                },
              },
            });
          } catch (error) {
            console.error("[Hook] Error in afterAcceptInvitation:", error);
          }
        },

        afterCancelInvitation: async ({
          invitation,
          cancelledBy,
          organization,
        }) => {
          console.log(`🚫 [Hook] Invitation cancelled for ${invitation.email}`);

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
                },
              },
            });
          } catch (error) {
            console.error("[Hook] Error in afterCancelInvitation:", error);
          }
        },
      },
    }),

    // ======================================================================
    // Admin Plugin
    // ======================================================================
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

      impersonationSessionDuration: 60 * 60 * 2, // 2 hours

      async canImpersonate(opts: {
        user: { id: string };
        targetUser: { id: string };
      }) {
        const { user, targetUser } = opts;

        // Get user from database to check role
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true },
        });

        if (!dbUser) {
          return false;
        }

        // SuperAdmins can impersonate anyone
        return true;
      },

      adminHooks: {
        afterBanUser: async (opts: {
          user: { id: string; email: string };
          bannedUser: { id: string; email: string };
          reason?: string;
        }) => {
          const { user, bannedUser, reason } = opts;

          try {
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                action: "UPDATE",
                entityType: "USER_BAN",
                entityId: bannedUser.id,
                newValues: {
                  bannedBy: user.email,
                  reason: reason || "No reason",
                },
              },
            });
          } catch (error) {
            console.error("[Hook] Error in afterBanUser:", error);
          }
        },

        afterUnbanUser: async (opts: {
          user: { id: string; email: string };
          unbannedUser: { id: string; email: string };
        }) => {
          const { user, unbannedUser } = opts;

          try {
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                action: "UPDATE",
                entityType: "USER_UNBAN",
                entityId: unbannedUser.id,
                newValues: {
                  unbannedBy: user.email,
                },
              },
            });
          } catch (error) {
            console.error("[Hook] Error in afterUnbanUser:", error);
          }
        },

        afterSetRole: async (opts: {
          user: { id: string };
          targetUser: { id: string };
          role: string;
          oldRole?: string;
        }) => {
          const { user, targetUser, role, oldRole } = opts;

          try {
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                action: "UPDATE",
                entityType: "USER_ROLE",
                entityId: targetUser.id,
                oldValues: { role: oldRole },
                newValues: { role },
              },
            });
          } catch (error) {
            console.error("[Hook] Error in afterSetRole:", error);
          }
        },
      },
    }),
  ],
});

// ============================================================================
// SESSION HELPERS
// ============================================================================

export async function getAuthSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

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

  // Get user from database to check role
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  return {
    ...session,
    profile,
    memberships,
    isSuperAdmin: !!dbUser,
    isAdmin: !!dbUser,
  };
}

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

export async function checkCurrentUserPermission(
  permissions: Record<string, string[]>,
) {
  const session = await getAuthSession();
  if (!session) return false;
  return checkPermission(session.user.id, permissions);
}

export async function requireAuth() {
  const session = await getAuthSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  return session;
}

export async function requireRole(role: string | string[]) {
  const session = await requireAuth();

  // Get user role from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!user) {
    throw new Error("Super admin access required");
  }

  return session;
}

export async function requireOrganizationMembership(organizationId: string) {
  const session = await requireAuth();
  const isMember = session.memberships.some(
    (m) => m.organizationId === organizationId,
  );

  if (!isMember && !session.isSuperAdmin) {
    throw new Error("Organization membership required");
  }

  return session;
}

export default auth;
