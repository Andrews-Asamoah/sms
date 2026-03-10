// lib/auth.ts - FULLY TYPED VERSION

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin, magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import prisma from "@/lib/prisma";
import {
  ac,
  superAdmin,
  owner,
  admin as adminRole,
  teacher,
  headteacher,
  accountant,
  student,
  guardian,
  staff,
  member as memberRole,
  user as userRole,
} from "@/lib/auth/permissions";
import {
  sendAdminInvitationEmail,
  sendGuardianInvitationEmail,
  sendPasswordResetEmail,
} from "@/lib/email/resend";
import { Gender } from "@/lib/generated/prisma/client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface BetterAuthOrganization {
  id: string;
  name: string;
  slug: string;
}

// ============================================================================
// BETTER AUTH INSTANCE
// ============================================================================

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
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
  // RATE LIMITING & SECURITY ENHANCEMENTS
  // ==========================================================================
  rateLimit: {
    window: 60, // time window in seconds
    max: 100, // max requests per window
    customRules: {
      "/api/auth/sign-in/email": {
        window: 60,
        max: 5, // Only 5 login attempts per minute
      },
      "/api/auth/sign-up/email": {
        window: 3600,
        max: 3, // Only 3 signups per hour from same IP
      },
    },
  },

  // ==========================================================================
  // PLUGINS
  // ==========================================================================
  plugins: [
    nextCookies(), // Enables robust session management over HTTP
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        console.log(`✨ [Auth] Magic link generated for ${email}: ${url}`);
        // Can wire up Resend here later if desired.
      },
    }),
    // ------------------------------------------------------------------------
    // ORGANIZATION PLUGIN
    // ------------------------------------------------------------------------
    organization({
      // ======================================================================
      // CUSTOM ROLES — stored directly in members.role column
      // ======================================================================
      ac,
      roles: {
        owner,
        admin: adminRole,
        member: memberRole,
        teacher,
        headteacher,
        accountant,
        staff,
        guardian,
        student,
      },

      // ======================================================================
      // PERMISSION: Who can create organizations?
      // ======================================================================
      allowUserToCreateOrganization: async (user: BetterAuthUser) => {
        console.log("\n[AUTH] CREATE_ORG PERMISSION CHECK");
        console.log(`User: ${user.email}`);

        // Query database for role
        const userRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });

        const isSuperAdmin = userRecord?.role === "superAdmin";
        console.log(`Permission: ${isSuperAdmin ? "GRANTED" : "DENIED"}\n`);

        return isSuperAdmin;
      },

      // ======================================================================
      // PERMISSION TO INVITE USERS
      // ======================================================================
      allowUserToInviteUser: async (opts: {
        user: BetterAuthUser;
        organization: BetterAuthOrganization;
      }) => {
        console.log("\n[AUTH] allowUserToInviteUser TRIGGERED");
        console.log(`User: ${opts.user.email}`);
        console.log(`Org: ${opts.organization.name} (${opts.organization.id})`);

        try {
          const userRecord = await prisma.user.findUnique({
            where: { id: opts.user.id },
            select: { role: true },
          });

          if (userRecord?.role === "superAdmin") {
            console.log("✅ [Auth] SuperAdmin permitted to invite");
            return true;
          }

          const membership = await prisma.member.findFirst({
            where: {
              userId: opts.user.id,
              organizationId: opts.organization.id,
              role: { in: ["owner", "admin"] },
            },
          });

          if (membership) {
            console.log(`✅ [Auth] ${membership.role} permitted to invite`);
            return true;
          }

          console.log("❌ [Auth] Permission DENIED in allowUserToInviteUser");
          return false;
        } catch (error) {
          console.error("❌ [Auth] Error in allowUserToInviteUser:", error);
          return false;
        }
      },

      // Alternative names for different Better Auth versions
      allowInvite: async (opts: any) => {
        console.log("\n[AUTH] allowInvite TRIGGERED");
        return true;
      },
      allowInviteUser: async (opts: any) => {
        console.log("\n[AUTH] allowInviteUser TRIGGERED");
        return true;
      },

      organizationLimit: 100,
      membershipLimit: 1000,

      // ======================================================================
      // HOOKS: Organization lifecycle events
      // ======================================================================
      organizationHooks: {
        // =====================================================================
        // AFTER CREATE INVITATION - Send email here!
        // =====================================================================
        afterCreateInvitation: async ({
          invitation,
          inviter,
          organization,
        }) => {
          console.log("\n[AUTH] 📧 afterCreateInvitation hook triggered");
          console.log(`Email: ${invitation.email}`);
          console.log(`Organization: ${organization.name}`);

          try {
            // Get organization with school data
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

            if (!org || !org.school) {
              console.error("[Auth] Organization or school not found");
              return;
            }

            // Get invitation details
            const invitationRecord = await prisma.invitation.findUnique({
              where: { id: invitation.id },
              select: {
                role: true,
                expiresAt: true,
              },
            });

            if (!invitationRecord) {
              console.error("[Auth] Invitation not found");
              return;
            }

            // Determine if this is a guardian invitation
            const isGuardianRole =
              invitationRecord.role?.toLowerCase() === "guardian";

            const guardian = await prisma.guardian.findFirst({
              where: {
                email: invitation.email,
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

            if (isGuardianRole || (guardian && guardian.students.length > 0)) {
              // Guardian invitation
              console.log(
                `[Auth] Sending guardian email to ${invitation.email}`,
              );

              const firstStudent = guardian?.students?.[0]?.student;
              const studentName = firstStudent
                ? `${firstStudent.profile.firstName} ${firstStudent.profile.lastName}`
                : "your child";
              const guardianName = guardian
                ? `${guardian.firstName} ${guardian.lastName}`
                : invitation.email;

              await sendGuardianInvitationEmail({
                to: invitation.email,
                guardianName,
                studentName,
                schoolName: org.school.name,
                invitationId: invitation.id,
                expiresAt: invitationRecord.expiresAt,
              });

              console.log(`✅ [Auth] Guardian email sent`);
            } else {
              // Admin/Staff invitation
              console.log(`[Auth] Sending admin email to ${invitation.email}`);

              await sendAdminInvitationEmail({
                to: invitation.email,
                inviterName: inviter.name || inviter.email,
                schoolName: org.school.name,
                role: invitationRecord.role || "member",
                invitationId: invitation.id,
                expiresAt: invitationRecord.expiresAt,
              });

              console.log(`✅ [Auth] Admin email sent`);
            }
          } catch (error) {
            console.error("[Auth] Error in afterCreateInvitation:", error);
            // Don't throw - invitation was created successfully
          }
        },

        // =====================================================================
        // AFTER ADD MEMBER
        // =====================================================================
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

            // ----------------------------------------------------------------
            // EMAIL VERIFICATION — mark verified + clear verification tokens
            // All invitation-accepted users have proven email ownership by
            // clicking the invite link, so no verification token is needed.
            // ----------------------------------------------------------------
            await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: true },
            });

            // Delete any stale email-verification tokens (applies to ALL invited users)
            await prisma.verification.deleteMany({
              where: { identifier: user.email },
            });

            console.log(
              `✅ [Auth] Email verified and verification tokens cleared for ${user.email}`,
            );

            // ----------------------------------------------------------------
            // GUARDIAN LINKING
            // ----------------------------------------------------------------
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

            // ----------------------------------------------------------------
            // TEACHER LINKING — link pending Teacher record on invite acceptance
            // ----------------------------------------------------------------
            const school = await prisma.school.findUnique({
              where: { organizationId: organization.id },
              select: { id: true },
            });

            const userProfile = await prisma.userProfile.findUnique({
              where: { userId: user.id },
            });

            if (school && userProfile) {
              const linked = await prisma.teacher.updateMany({
                where: {
                  invitationEmail: user.email,
                  schoolId: school.id,
                  profileId: null,
                },
                data: {
                  profileId: userProfile.id,
                  invitationEmail: null,
                },
              });

              if (linked.count > 0) {
                console.log(
                  `✅ [Auth] Linked ${linked.count} Teacher record(s) for ${user.email}`,
                );
              }
            }

            // ----------------------------------------------------------------
            // AUDIT LOG
            // ----------------------------------------------------------------
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

        // =====================================================================
        // BEFORE REMOVE MEMBER
        // =====================================================================
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

        // =====================================================================
        // AFTER REMOVE MEMBER
        // =====================================================================
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

        // =====================================================================
        // AFTER ACCEPT INVITATION
        // =====================================================================
        afterAcceptInvitation: async ({ invitation, user, organization }) => {
          console.log(`✅ [Auth] Invitation accepted by ${user.email}`);

          try {
            // ------------------------------------------------------------------
            // ENSURE USER PROFILE EXISTS
            // (new users may not have a profile yet at this point)
            // ------------------------------------------------------------------
            let userProfile = await prisma.userProfile.findUnique({
              where: { userId: user.id },
            });

            if (!userProfile) {
              console.log(
                `📝 [Auth] Creating profile for invited user ${user.email}`,
              );
              const nameParts = user.name.trim().split(/\s+/);
              const firstName = nameParts[0] || "User";
              const lastName =
                nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

              userProfile = await prisma.userProfile.create({
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
              console.log(`✅ [Auth] Profile created for invited user`);
            }

            // ------------------------------------------------------------------
            // MARK EMAIL VERIFIED — invitation link proves email ownership
            // ------------------------------------------------------------------
            await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: true },
            });
            await prisma.verification.deleteMany({
              where: { identifier: user.email },
            });
            console.log(`✅ [Auth] Email verified for ${user.email}`);

            // ------------------------------------------------------------------
            // LOOK UP THE SCHOOL for this organization
            // ------------------------------------------------------------------
            const school = await prisma.school.findUnique({
              where: { organizationId: organization.id },
              select: { id: true },
            });

            if (school && userProfile) {
              // ----------------------------------------------------------------
              // TEACHER LINKING — link pending Teacher record
              // ----------------------------------------------------------------
              const linkedTeachers = await prisma.teacher.updateMany({
                where: {
                  invitationEmail: invitation.email,
                  schoolId: school.id,
                  profileId: null,
                },
                data: {
                  profileId: userProfile.id,
                  invitationEmail: null,
                },
              });

              if (linkedTeachers.count > 0) {
                console.log(
                  `✅ [Auth] Linked ${linkedTeachers.count} Teacher record(s) for ${user.email}`,
                );
              }

              // ----------------------------------------------------------------
              // GUARDIAN LINKING — link pending Guardian record
              // ----------------------------------------------------------------
              const guardianRecord = await prisma.guardian.findFirst({
                where: {
                  email: invitation.email,
                  schoolId: school.id,
                  profileId: null,
                },
              });

              if (guardianRecord) {
                await prisma.guardian.update({
                  where: { id: guardianRecord.id },
                  data: { profileId: userProfile.id },
                });
                console.log(`✅ [Auth] Guardian linked for ${user.email}`);
              }
            }

            // ------------------------------------------------------------------
            // AUDIT LOG
            // ------------------------------------------------------------------
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

        // =====================================================================
        // AFTER CANCEL INVITATION
        // =====================================================================
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
        headteacher,
        teacher,
        accountant,
        student,
        guardian,
        staff,
        member: memberRole,
        user: userRole,
      },

      impersonationSessionDuration: 60 * 60 * 2,

      async canImpersonate(opts: {
        user: { id: string; role?: string };
        targetUser: { id: string };
      }) {
        const { user, targetUser } = opts;

        // Query database for role
        const userRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });

        if (userRecord?.role === "superAdmin") {
          return true;
        }

        if (userRecord?.role === "admin") {
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

  // ==========================================================================
  // USER ADDITIONAL FIELDS
  // ==========================================================================
  user: {
    additionalFields: {
      onboardingCompleted: {
        type: "boolean" as const,
        defaultValue: false,
        input: true, // allow updating via updateUser()
      },
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
