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

  // Enable organization and admin plugin
  plugins: [
    organization({
      allowUserToCreateOrganization: async (user) => {
        // Check if user has superAdmin role
        return user.role === "superAdmin";
      },
      organizationLimit: 100,
      sendInvitationEmail: async (data) => {
        console.log("Sending invitation to:", data.email);
        // TODO: Implement actual email sending
      },
    }),
    admin({
      // Pass the access controller
      ac,

      // Pass all custom roles - must be individually named
      roles: {
        superAdmin,
        admin: adminRole,
        teacher,
        accountant,
        student,
        guardian,
        user: userRole,
      },

      // Impersonation settings
      impersonationSessionDuration: 60 * 60 * 2, // 2 hours

      // Custom impersonation logic
      async canImpersonate(opts: {
        user: { id: string; role?: string };
        targetUser: { id: string };
      }) {
        const { user, targetUser } = opts;

        // Super admins can impersonate anyone
        if (user.role === "superAdmin") {
          return true;
        }

        // School admins can only impersonate users in their schools
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

          // Check if they share any organizations
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

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, //5 minutes
    },
  },
});

//** Enhanced session helper with full context */
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

/**
 * Check if user has specific permission
 */
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

/**
 * Check if current session user has specific permission
 */
export async function checkCurrentUserPermission(
  permissions: Record<string, string[]>
) {
  const session = await getAuthSession();
  if (!session) return false;

  return checkPermission(session.user.id, permissions);
}
