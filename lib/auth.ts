// lib/auth.ts - COMPLETE FIXED VERSION

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin } from "better-auth/plugins";
import prisma from "@/lib/prisma";
import {
  ac,
  superAdmin,
  owner,
  admin as adminRole,
  teacher,
  accountant,
  student,
  guardian,
  staff,
  user as userRole,
} from "@/lib/auth/permissions";
import {
  sendAdminInvitationEmail,
  sendGuardianInvitationEmail,
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

    sendResetPassword: async ({ user, url }) => {
      console.log(`📧 [Auth] Sending password reset email to ${user.email}`);
      try {
        await sendPasswordResetEmail({
          to: user.email,
          userName: user.name,
          resetUrl: url,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
        console.log(`✅ [Auth] Password reset email sent to ${user.email}`);
      } catch (error) {
        console.error("[Auth] Error sending password reset email:", error);
      }
    },

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
      } catch (error) {
        console.error("[Auth] Error creating audit log:", error);
      }
    },

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
      ac,
      roles: {
        owner,
        admin: adminRole,
        teacher,
        accountant,
        student,
        guardian,
        staff,
        member: userRole,
      },

      // ======================================================================
      // PERMISSION: Who can create organizations?
      // ======================================================================
      allowUserToCreateOrganization: async (user) => {
        const isSuperAdmin = user.role === "superAdmin";

        console.log(
          `[Auth] CREATE_ORG - User: ${user.email}, Role: ${user.role}`,
        );
        console.log(`[Auth] CREATE_ORG - Can create: ${isSuperAdmin}`);

        return isSuperAdmin;
      },

      // ======================================================================
      // PERMISSION: Who can invite users to organizations?
      // CRITICAL: This function MUST return true for invitations to work
      // ======================================================================
      // In your lib/auth.ts, replace allowUserToInviteUser with this:

      allowUserToInviteUser: async (opts: {
        user: { id: string; email: string; role?: string };
        organization: { id: string; name: string };
      }): Promise<boolean> => {
        const { user, organization } = opts;

        console.log("");
        console.log("=".repeat(70));
        console.log("🔐 [Auth] INVITATION PERMISSION CHECK");
        console.log("=".repeat(70));
        console.log(`👤 User ID:    ${user.id}`);
        console.log(`👤 User Email: ${user.email}`);
        console.log(`👤 User Role:  ${user.role || "UNDEFINED!"}`); // ⚠️ Check this!
        console.log(`🏢 Org ID:     ${organization.id}`);
        console.log("");

        // ✅ STRATEGY 1: Check if role field exists and is superAdmin
        if (user.role === "superAdmin") {
          console.log("✅ PERMISSION GRANTED - SUPERADMIN (from session)");
          console.log("=".repeat(70));
          console.log("");
          return true;
        }

        // ✅ STRATEGY 2: Query the User table directly (FALLBACK)
        console.log("⚠️ Role not in session, checking database...");
        const userRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });

        console.log(`📊 DB Query Result: role = ${userRecord?.role || "NULL"}`);

        if (userRecord?.role === "superAdmin") {
          console.log("✅ PERMISSION GRANTED - SUPERADMIN (from database)");
          console.log("=".repeat(70));
          console.log("");
          return true;
        }

        // ✅ STRATEGY 3: Check membership
        console.log("⚠️ Not a SuperAdmin, checking membership...");
        const membership = await prisma.member.findFirst({
          where: {
            userId: user.id,
            organizationId: organization.id,
            role: { in: ["owner", "admin"] },
          },
        });

        if (membership) {
          console.log(`✅ PERMISSION GRANTED - MEMBER (${membership.role})`);
          console.log("=".repeat(70));
          console.log("");
          return true;
        }

        console.log("❌ PERMISSION DENIED");
        console.log("=".repeat(70));
        console.log("");
        return false;
      },
      organizationLimit: 100,

      // ======================================================================
      // EMAIL: Send invitation emails
      // ======================================================================
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
                  id: true,
                },
              },
            },
          });

          if (!org || !org.school?.id) {
            console.error("[Auth] Organization or school not found");
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

          // Check if this is a guardian invitation
          const guardian = await prisma.guardian.findFirst({
            where: {
              email,
              schoolId: org.school.id,
            },
            include: {
              students: {
                include: {
                  student: {
                    include: {
                      profile: true,
                    },
                  },
                },
              },
            },
          });

          if (guardian && guardian.students.length > 0) {
            // Guardian invitation
            console.log(`✓ [Auth] Guardian invitation for ${email}`);

            const firstStudent = guardian.students[0].student;
            const studentName = `${firstStudent.profile.firstName} ${firstStudent.profile.lastName}`;
            const guardianName = `${guardian.firstName} ${guardian.lastName}`;

            await sendGuardianInvitationEmail({
              to: email,
              guardianName,
              studentName,
              schoolName: org.school.name,
              invitationId: id,
              expiresAt: invitation.expiresAt,
            });

            console.log(`✅ [Auth] Guardian email sent to ${email}`);
          } else {
            // Admin/Staff invitation
            console.log(`✓ [Auth] Admin/Staff invitation for ${email}`);

            const inviterUser = await prisma.user.findUnique({
              where: { id: inviter.id },
              select: { name: true, email: true },
            });

            await sendAdminInvitationEmail({
              to: email,
              inviterName:
                inviterUser?.name || inviterUser?.email || "Administrator",
              schoolName: org.school.name,
              role: invitation.role || "member",
              invitationId: id,
              expiresAt: invitation.expiresAt,
            });

            console.log(`✅ [Auth] Admin email sent to ${email}`);
          }
        } catch (error) {
          console.error("[Auth] Error in sendInvitationEmail:", error);
        }
      },

      // ======================================================================
      // HOOKS: Organization lifecycle events
      // ======================================================================
      organizationHooks: {
        afterAddMember: async ({ user, organization, member }) => {
          console.log(
            `✅ [Auth] Member added: ${user.email} → ${organization.name} as ${member.role}`,
          );

          try {
            // Create UserProfile if needed
            const existingProfile = await prisma.userProfile.findUnique({
              where: { userId: user.id },
            });

            if (!existingProfile) {
              console.log(`📝 [Auth] Creating profile for ${user.email}`);

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

              console.log(`✅ [Auth] Profile created`);
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
              console.log(`✅ [Auth] Email verified for ${user.email}`);
            }

            // Link guardian profile if applicable
            const guardianRecord = await prisma.guardian.findFirst({
              where: {
                email: user.email,
                profileId: null,
              },
            });

            if (guardianRecord) {
              console.log(`🔗 [Auth] Linking guardian profile`);

              const userProfile = await prisma.userProfile.findUnique({
                where: { userId: user.id },
              });

              if (userProfile) {
                await prisma.guardian.update({
                  where: { id: guardianRecord.id },
                  data: { profileId: userProfile.id },
                });
                console.log(`✅ [Auth] Guardian linked`);
              }
            }

            // Audit log
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
          } catch (error) {
            console.error("[Auth] Error in afterAddMember:", error);
          }
        },

        beforeRemoveMember: async ({ user, organization }) => {
          console.log(
            `🗑️ [Auth] Removing ${user.email} from ${organization.name}`,
          );

          try {
            const memberCount = await prisma.member.count({
              where: { userId: user.id },
            });

            if (memberCount === 1) {
              console.warn(`⚠️ [Auth] Last organization for ${user.email}`);
            }
          } catch (error) {
            console.error("[Auth] Error in beforeRemoveMember:", error);
          }
        },

        afterRemoveMember: async ({ member, user, organization }) => {
          console.log(`✅ [Auth] Member removed: ${user.email}`);

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
          } catch (error) {
            console.error("[Auth] Error in afterRemoveMember:", error);
          }
        },

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
        staff,
        user: userRole,
      },

      impersonationSessionDuration: 60 * 60 * 2,

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

import { getSession } from "@/lib/auth/session";
import { checkPermission as apiCheckPermission } from "@/lib/auth/api";

export async function getAuthSession() {
  return getSession();
}

export async function checkPermission(
  userId: string,
  permissions: Record<string, string[]>,
) {
  return apiCheckPermission(userId, permissions);
}

export async function checkCurrentUserPermission(
  permissions: Record<string, string[]>,
) {
  const session = await getSession();
  if (!session) return false;
  return apiCheckPermission(session.user.id, permissions);
}
