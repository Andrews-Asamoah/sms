// lib/auth.ts - REFACTORED with Better Auth password reset
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

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,

    // Password reset configuration
    sendResetPassword: async ({ user, url, token }, request) => {
      console.log(`📧 [Auth] Sending password reset email to ${user.email}`);

      try {
        // Send password reset email using your email service
        await sendPasswordResetEmail({
          to: user.email,
          userName: user.name,
          resetUrl: url, // This URL includes the token automatically
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        });

        console.log(`✅ [Auth] Password reset email sent to ${user.email}`);
      } catch (error) {
        console.error("[Auth] Error sending password reset email:", error);
        // Don't throw - we don't want to reveal if the email exists
      }
    },

    // Optional: Hook that runs after password is successfully reset
    onPasswordReset: async ({ user }, request) => {
      console.log(`✅ [Auth] Password reset completed for ${user.email}`);

      try {
        // Log the password reset for audit purposes
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

        console.log(`✅ [Auth] Audit log created for password reset`);
      } catch (error) {
        console.error("[Auth] Error creating audit log:", error);
      }
    },

    // Token expiration time (in seconds) - default is 3600 (1 hour)
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: async (user) => {
        return user.role === "superAdmin";
      },
      organizationLimit: 100,

      // Better Auth calls this when invitation is created
      async sendInvitationEmail(data) {
        const { email, id, organization, inviter } = data;

        try {
          console.log(`📧 [Auth Hook] Sending invitation email to ${email}`);

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
            console.error("[Auth Hook] Organization not found for invitation");
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
            console.error("[Auth Hook] Invitation not found");
            return;
          }

          const inviterUser = await prisma.user.findUnique({
            where: { id: inviter.id },
            select: {
              name: true,
              email: true,
            },
          });

          await sendAdminInvitationEmail({
            to: email,
            inviterName:
              inviterUser?.name || inviterUser?.email || "Administrator",
            schoolName: org.school?.name || org.name,
            role: invitation.role || "member",
            invitationId: id,
            expiresAt: invitation.expiresAt,
          });

          console.log(`✅ [Auth Hook] Invitation email sent to ${email}`);
        } catch (error) {
          console.error("[Auth Hook] Error in sendInvitationEmail:", error);
        }
      },

      // Organization hooks for automation
      organizationHooks: {
        // After a member is added to organization
        afterAddMember: async ({ user, organization, member }) => {
          console.log(
            `✅ [Auth Hook] Member added: ${user.email} to ${organization.name}`,
          );
          console.log(`   Role: ${member.role}`);

          try {
            // Create UserProfile if it doesn't exist
            const existingProfile = await prisma.userProfile.findUnique({
              where: { userId: user.id },
            });

            if (!existingProfile) {
              console.log(
                `📝 [Auth Hook] Creating user profile for ${user.email}`,
              );

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

              console.log(`✅ [Auth Hook] Profile created for ${user.email}`);
            } else {
              console.log(
                `ℹ️ [Auth Hook] Profile already exists for ${user.email}`,
              );
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
              console.log(`✅ [Auth Hook] Email verified for ${user.email}`);
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

            console.log(`✅ [Auth Hook] Audit log created for member addition`);
          } catch (error) {
            console.error("[Auth Hook] Error in afterAddMember:", error);
            // Don't throw - we don't want to fail the member addition
          }
        },

        // Before removing a member
        beforeRemoveMember: async ({ user, organization }) => {
          console.log(
            `🗑️ [Auth Hook] Preparing to remove ${user.email} from ${organization.name}`,
          );

          try {
            // Check if this is their last organization
            const memberCount = await prisma.member.count({
              where: { userId: user.id },
            });

            if (memberCount === 1) {
              console.log(
                `⚠️ [Auth Hook] Warning: ${user.email} will have no organizations after removal`,
              );
            }
          } catch (error) {
            console.error("[Auth Hook] Error in beforeRemoveMember:", error);
          }
        },

        // After removing a member
        afterRemoveMember: async ({ member, user, organization }) => {
          console.log(
            `✅ [Auth Hook] Member removed: ${user.email} from ${organization.name}`,
          );

          try {
            // Log the removal for audit purposes
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
                },
              },
            });

            console.log(`✅ [Auth Hook] Audit log created for member removal`);
          } catch (error) {
            console.error("[Auth Hook] Error in afterRemoveMember:", error);
          }
        },

        // After accepting an invitation
        afterAcceptInvitation: async ({ invitation, user, organization }) => {
          console.log(`✅ [Auth Hook] Invitation accepted by ${user.email}`);
          console.log(`   Organization: ${organization.name}`);
          console.log(`   Invitation ID: ${invitation.id}`);

          try {
            // Log acceptance
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
                },
              },
            });

            console.log(
              `✅ [Auth Hook] Audit log created for invitation acceptance`,
            );
          } catch (error) {
            console.error("[Auth Hook] Error in afterAcceptInvitation:", error);
          }
        },

        // After cancelling an invitation
        afterCancelInvitation: async ({
          invitation,
          cancelledBy,
          organization,
        }) => {
          console.log(
            `🚫 [Auth Hook] Invitation cancelled for ${invitation.email}`,
          );

          try {
            // Log cancellation
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
                },
              },
            });

            console.log(
              `✅ [Auth Hook] Audit log created for invitation cancellation`,
            );
          } catch (error) {
            console.error("[Auth Hook] Error in afterCancelInvitation:", error);
          }
        },
      },
    }),
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
      impersonationSessionDuration: 60 * 60 * 2, // 2 hours
      async canImpersonate(opts: {
        user: { id: string; role?: string };
        targetUser: { id: string };
      }) {
        const { user, targetUser } = opts;
        if (user.role === "superAdmin") {
          return true;
        }
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
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
});

// Export session helpers (keep existing functions)
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

  return {
    ...session,
    profile,
    memberships,
    isSuperAdmin: session.user.role === "superAdmin",
    isAdmin:
      session.user.role === "admin" || session.user.role === "superAdmin",
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
