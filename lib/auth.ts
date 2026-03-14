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
  member as memberRole,
  user as userRole,
  staff,
} from "@/lib/auth/permissions";
import {
  sendAdminInvitationEmail,
  sendGuardianInvitationEmail,
  sendPasswordResetEmail,
} from "@/lib/email/resend";
import { Gender, StaffType, EmploymentType } from "@/lib/generated/prisma/client";

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
    autoSignIn: false,

    sendResetPassword: async ({ user, url }) => {
      try {
        await sendPasswordResetEmail({
          to: user.email,
          userName: user.name,
          resetUrl: url,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
      } catch (error) {
        console.error("[Auth] Error sending password reset email:", error);
      }
    },

    onPasswordReset: async ({ user }) => {
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
        // Wire up Resend here when needed.
        void email; void url;
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
        guardian,
        student,
        staff,
      },

      // ======================================================================
      // PERMISSION: Who can create organizations?
      // ======================================================================
      allowUserToCreateOrganization: async (user: BetterAuthUser) => {
        // Query database for role
        const userRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        return userRecord?.role === "superAdmin";
      },

      // ======================================================================
      // PERMISSION TO INVITE USERS
      // ======================================================================
      allowUserToInviteUser: async (opts: {
        user: BetterAuthUser;
        organization: BetterAuthOrganization;
      }) => {
        try {
          const userRecord = await prisma.user.findUnique({
            where: { id: opts.user.id },
            select: { role: true },
          });

          if (userRecord?.role === "superAdmin") return true;

          const membership = await prisma.member.findFirst({
            where: {
              userId: opts.user.id,
              organizationId: opts.organization.id,
              role: { in: ["owner", "admin"] },
            },
          });

          return !!membership;
        } catch (error) {
          console.error("[Auth] Error in allowUserToInviteUser:", error);
          return false;
        }
      },

      // Alternative names for different Better Auth versions
      allowInvite: async (_opts: unknown) => true,
      allowInviteUser: async (_opts: unknown) => true,

      organizationLimit: 100,
      membershipLimit: 1000,
      requireEmailVerificationOnInvitation: false,

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
            } else {
              await sendAdminInvitationEmail({
                to: invitation.email,
                inviterName: inviter.name || inviter.email,
                schoolName: org.school.name,
                role: invitationRecord.role || "member",
                invitationId: invitation.id,
                expiresAt: invitationRecord.expiresAt,
              });
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
          try {
            // Create UserProfile if needed
            const existingProfile = await prisma.userProfile.findUnique({
              where: { userId: user.id },
            });

            if (!existingProfile) {
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
            }

            // EMAIL VERIFICATION — mark verified + clear stale tokens
            await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: true },
            });
            await prisma.verification.deleteMany({
              where: { identifier: user.email },
            });

            // GUARDIAN LINKING
            const guardianRecord = await prisma.guardian.findFirst({
              where: { email: user.email, profileId: null },
            });

            if (guardianRecord) {
              const userProfile = await prisma.userProfile.findUnique({
                where: { userId: user.id },
              });
              if (userProfile) {
                await prisma.guardian.update({
                  where: { id: guardianRecord.id },
                  data: { profileId: userProfile.id },
                });
              }
            }

            // TEACHER LINKING — link pending Teacher record on invite acceptance
            const school = await prisma.school.findUnique({
              where: { organizationId: organization.id },
              select: { id: true },
            });

            const userProfile = await prisma.userProfile.findUnique({
              where: { userId: user.id },
            });

            if (school && userProfile) {
              await prisma.teacher.updateMany({
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

              // STAFF LINKING — create Staff record for administrative roles
              const role = member.role?.toUpperCase();
              const isStaffRole = ["ACCOUNTANT", "ADMIN", "HEADTEACHER"].includes(role);

              if (isStaffRole) {
                // Check if staff record already exists
                const existingStaff = await prisma.staff.findFirst({
                  where: {
                    schoolId: school.id,
                    profileId: userProfile.id,
                  },
                });

                if (!existingStaff) {
                  const year = new Date().getFullYear();
                  const random = Math.floor(1000 + Math.random() * 9000);
                  const staffId = `S-${year}-${random}`;
                  const staffNumber = `SN-S-${year}-${random}`;

                  let staffType: StaffType = StaffType.OTHER;
                  if (role === "ACCOUNTANT") {
                    staffType = StaffType.ACCOUNTANT;
                  } else if (role === "ADMIN") {
                    staffType = StaffType.ADMIN;
                  }
                  else if (role === "HEADTEACHER") staffType = StaffType.OTHER; // No direct mapping, keep as OTHER or add to enum

                  await prisma.staff.create({
                    data: {
                      schoolId: school.id,
                      profileId: userProfile.id,
                      staffId,
                      staffNumber,
                      staffType,
                      employmentType: EmploymentType.FULL_TIME,
                      isActive: true,
                    },
                  });
                }
              }
            }

            // AUDIT LOG
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
        beforeRemoveMember: async ({ user, organization: _org }) => {
          try {
            // Future: block removal if it's the last owner
            void user;
          } catch (error) {
            console.error("[Auth] Error in beforeRemoveMember:", error);
          }
        },

        // =====================================================================
        // AFTER REMOVE MEMBER
        // =====================================================================
        afterRemoveMember: async ({ member, user, organization }) => {
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
          try {
            // ------------------------------------------------------------------
            // ENSURE USER PROFILE EXISTS
            // (new users may not have a profile yet at this point)
            // ------------------------------------------------------------------
            let userProfile = await prisma.userProfile.findUnique({
              where: { userId: user.id },
            });

            if (!userProfile) {
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
            }

            // MARK EMAIL VERIFIED — invitation link proves email ownership
            await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: true },
            });
            await prisma.verification.deleteMany({
              where: { identifier: user.email },
            });

            // ------------------------------------------------------------------
            // LOOK UP THE SCHOOL for this organization
            // ------------------------------------------------------------------
            const school = await prisma.school.findUnique({
              where: { organizationId: organization.id },
              select: { id: true },
            });

            if (school && userProfile) {
              // TEACHER LINKING — link pending Teacher record
              await prisma.teacher.updateMany({
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

              // GUARDIAN LINKING — link pending Guardian record
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
              }

              // STAFF LINKING — create Staff record for administrative roles
              const invitedRole = invitation.role?.toUpperCase();
              const isStaffRole = ["ACCOUNTANT", "ADMIN", "HEADTEACHER"].includes(invitedRole);

              if (isStaffRole) {
                // Check if staff record already exists
                const existingStaff = await prisma.staff.findFirst({
                  where: {
                    schoolId: school.id,
                    profileId: userProfile.id,
                  },
                });

                if (!existingStaff) {
                  const year = new Date().getFullYear();
                  const random = Math.floor(1000 + Math.random() * 9000);
                  const staffId = `S-${year}-${random}`;
                  const staffNumber = `SN-S-${year}-${random}`;

                  let staffType: StaffType = StaffType.OTHER;
                  if (invitedRole === "ACCOUNTANT") {
                    staffType = StaffType.ACCOUNTANT;
                  } else if (invitedRole === "ADMIN") {
                    staffType = StaffType.ADMIN;
                  }
                  else if (invitedRole === "HEADTEACHER") staffType = StaffType.OTHER; // No direct mapping, keep as OTHER or add to enum

                  await prisma.staff.create({
                    data: {
                      schoolId: school.id,
                      profileId: userProfile.id,
                      staffId,
                      staffNumber,
                      staffType,
                      employmentType: EmploymentType.FULL_TIME,
                      isActive: true,
                    },
                  });
                }
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
        guardian,
        student,
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
    additionalFields: {},
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
