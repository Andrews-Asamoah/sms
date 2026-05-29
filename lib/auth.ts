// lib/auth.ts - FULLY TYPED VERSION

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin, magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import prisma from "@/lib/prisma";
import { resolveSubscriptionLimits } from "@/lib/subscription/limits";
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
  suspended,
} from "@/lib/auth/permissions";
import {
  sendAdminInvitationEmail,
  sendGuardianInvitationEmail,
  sendPasswordResetEmail,
} from "@/lib/email/resend";
import {
  Gender,
  StaffType,
  EmploymentType,
} from "@prisma/client";

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
        void email;
        void url;
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

      dynamicAccessControl: {
        enabled: true,
        maximumRolesPerOrganization: 10,
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
      sendInvitationEmail: async (data) => {
        try {
          // Get organization with school data
          const org = await prisma.organization.findUnique({
            where: { id: data.organization.id },
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
            console.error("[Auth] sendInvitationEmail: Organization or school not found");
            return;
          }

          // Get invitation details for expiresAt
          const invitationRecord = await prisma.invitation.findUnique({
            where: { id: data.id },
            select: {
              role: true,
              expiresAt: true,
            },
          });

          if (!invitationRecord) {
            console.error("[Auth] sendInvitationEmail: Invitation not found");
            return;
          }

          // Determine if this is a guardian invitation
          const isGuardianRole =
            invitationRecord.role?.toLowerCase() === "guardian";

          const guardian = await prisma.guardian.findFirst({
            where: {
              email: data.email,
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
              : data.email;

            await sendGuardianInvitationEmail({
              to: data.email,
              guardianName,
              studentName,
              schoolName: org.school.name,
              invitationId: data.id,
              expiresAt: invitationRecord.expiresAt,
            });
          } else {
            await sendAdminInvitationEmail({
              to: data.email,
              inviterName: data.inviter.user.name || data.inviter.user.email,
              schoolName: org.school.name,
              role: invitationRecord.role || "member",
              invitationId: data.id,
              expiresAt: invitationRecord.expiresAt,
            });
          }

          console.log(`[Auth] sendInvitationEmail: Email sent to ${data.email} for ${org.school.name}`);
        } catch (error) {
          console.error("[Auth] Error in sendInvitationEmail:", error);
        }
      },

      // ======================================================================
      // HOOKS: Organization lifecycle events
      // ======================================================================
      organizationHooks: {
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

            // GLOBAL ROLE SYNC —————————————————————————————————
            // Better Auth's admin plugin reads session.user.role (the global
            // `user.role` DB field) to check admin permissions like
            // setUserPassword. School-level roles live in member.role, so we
            // sync elevated roles to user.role so those checks pass.
            const memberRole = member.role?.toLowerCase();
            const elevatedRoles = [
              "owner",
              "admin",
              "headteacher",
              "superAdmin",
            ];
            if (memberRole && elevatedRoles.includes(memberRole)) {
              const currentUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { role: true },
              });
              // Only upgrade if not already superAdmin
              if (currentUser?.role !== "superAdmin") {
                await prisma.user.update({
                  where: { id: user.id },
                  data: { role: memberRole },
                });
              }
            }

            // SCHOOL LOOKUP — must be done before guardian linking so we can
            // scope the query to this school only and avoid cross-school linking.
            const school = await prisma.school.findUnique({
              where: { organizationId: organization.id },
              select: { id: true },
            });

            const userProfile = await prisma.userProfile.findUnique({
              where: { userId: user.id },
            });

            // GUARDIAN LINKING — scoped to this school to prevent cross-school linking
            if (school && userProfile) {
              const guardianRecord = await prisma.guardian.findFirst({
                where: {
                  email: user.email,
                  schoolId: school.id, // ✅ Scoped to this org's school
                  profileId: null,
                },
              });

              if (guardianRecord) {
                await prisma.guardian.update({
                  where: { id: guardianRecord.id },
                  data: { profileId: userProfile.id },
                });
              }
            }

            if (school && userProfile) {
              // Get subscription limits
              const subscription = await prisma.subscription.findUnique({
                where: { schoolId: school.id },
                select: { maxTeachers: true, maxStudents: true, maxStaff: true, planType: true },
              });

              const limits = resolveSubscriptionLimits(subscription);

              // TEACHER LINKING
              const teacherCount = await prisma.teacher.count({
                where: {
                  schoolId: school.id,
                  isActive: true,
                  profileId: { not: null },
                },
              });

              if (limits.teachers === null || teacherCount < limits.teachers) {
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
              }

              // STAFF LINKING
              const role = member.role?.toUpperCase();
              const isStaffRole = [
                "ACCOUNTANT",
                "ADMIN",
                "HEADTEACHER",
              ].includes(role);

              if (isStaffRole) {
                const staffCount = await prisma.staff.count({
                  where: { schoolId: school.id, isActive: true },
                });

                if (limits.staff === null || staffCount < limits.staff) {
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
            }

            // AUDIT LOG — include schoolId for per-school audit filtering
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                schoolId: school?.id ?? null,
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
            const school = await prisma.school.findUnique({
              where: { organizationId: organization.id },
              select: { id: true },
            });
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                schoolId: school?.id ?? null,
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
            // ENSURE USER PROFILE EXISTS
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

            // MARK EMAIL VERIFIED
            await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: true },
            });
            await prisma.verification.deleteMany({
              where: { identifier: user.email },
            });

            // GLOBAL ROLE SYNC — same logic as afterAddMember.
            // Sync elevated org roles to global user.role so Better Auth's
            // admin plugin will grant setUserPassword rights to school admins.
            const invitedRoleLower = invitation.role?.toLowerCase();
            const elevatedRolesInv = [
              "owner",
              "admin",
              "headteacher",
              "superAdmin",
            ];
            if (
              invitedRoleLower &&
              elevatedRolesInv.includes(invitedRoleLower)
            ) {
              const currentUserRecord = await prisma.user.findUnique({
                where: { id: user.id },
                select: { role: true },
              });
              if (currentUserRecord?.role !== "superAdmin") {
                await prisma.user.update({
                  where: { id: user.id },
                  data: { role: invitedRoleLower },
                });
              }
            }

            // LOOK UP THE SCHOOL
            const school = await prisma.school.findUnique({
              where: { organizationId: organization.id },
              select: { id: true },
            });

            if (school && userProfile) {
              // Get subscription limits
              const subscription = await prisma.subscription.findUnique({
                where: { schoolId: school.id },
                select: { maxTeachers: true, maxStudents: true, maxStaff: true, planType: true },
              });

              const limits = resolveSubscriptionLimits(subscription);

              // TEACHER LINKING
              const teacherCount = await prisma.teacher.count({
                where: {
                  schoolId: school.id,
                  isActive: true,
                  profileId: { not: null },
                },
              });

              if (limits.teachers === null || teacherCount < limits.teachers) {
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
              }

              // GUARDIAN LINKING
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

              // STAFF LINKING
              const invitedRole = invitation.role?.toUpperCase();
              const isStaffRole = [
                "ACCOUNTANT",
                "ADMIN",
                "HEADTEACHER",
              ].includes(invitedRole);

              if (isStaffRole) {
                const staffCount = await prisma.staff.count({
                  where: { schoolId: school.id, isActive: true },
                });

                if (limits.staff === null || staffCount < limits.staff) {
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
            }

            // AUDIT LOG
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                schoolId: school?.id ?? null,
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
            const school = await prisma.school.findUnique({
              where: { organizationId: organization.id },
              select: { id: true },
            });
            await prisma.auditLog.create({
              data: {
                userId: cancelledBy.id,
                schoolId: school?.id ?? null,
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

      // ── adminRoles ────────────────────────────────────────────────────────
      // Roles listed here are allowed to call admin-plugin endpoints (e.g.
      // setUserPassword, banUser). Better Auth compares this list against
      // the session user's GLOBAL `user.role` field.  We include all
      // elevated school roles so that owner/admin/headteacher accounts
      // can reset student passwords without needing a platform-superAdmin.
      adminRoles: ["superAdmin", "owner", "admin", "headteacher"],

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
    // ── Cookie cache DISABLED ────────────────────────────────────────────────
    // Cookie cache stores user.role (and other user data) in a signed cookie
    // for up to maxAge seconds. This means role changes in the DB are NOT
    // reflected in existing sessions until the cache expires.
    //
    // We disable it so that when the reset-password route self-heals the
    // calling admin's user.role in the DB, the subsequent auth.api.setUserPassword
    // call reads the updated role immediately (fresh DB read, not stale cookie).
    //
    // Performance impact is negligible for a school management system:
    // one extra DB lookup per request vs. the benefit of correct role checks.
    cookieCache: {
      enabled: false,
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
