// lib/auth.ts
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
import { sendAdminInvitationEmail } from "@/lib/email/resend";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,
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
          // Get school details
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
            console.error("Organization not found for invitation");
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
            console.error("Invitation not found");
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

          // Send the email
          await sendAdminInvitationEmail({
            to: email,
            inviterName:
              inviterUser?.name || inviterUser?.email || "Administrator",
            schoolName: org.school?.name || org.name,
            role: invitation.role || "member",
            invitationId: id,
            expiresAt: invitation.expiresAt,
          });

          console.log(
            `Invitation email sent to ${email} for organization ${organization.id}`
          );
        } catch (error) {
          console.error("Error in sendInvitationEmail callback:", error);
          // Don't throw - let Better Auth continue
        }
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
              role: "ADMIN",
            },
            select: { organizationId: true },
          });
          const targetMemberships = await prisma.member.findMany({
            where: { userId: targetUser.id },
            select: { organizationId: true },
          });
          return adminMemberships.some((admin) =>
            targetMemberships.some(
              (target) => target.organizationId === admin.organizationId
            )
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
  permissions: Record<string, string[]>
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
  permissions: Record<string, string[]>
) {
  const session = await getAuthSession();
  if (!session) return false;
  return checkPermission(session.user.id, permissions);
}
