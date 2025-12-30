// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import prisma from "@/lib/prisma";

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

  // Enable organization plugin
  plugins: [
    organization({
      // Allow users to create organizations (schools)
      allowUserToCreateOrganization: async (user) => {
        // Check if user is super admin
        const profile = await prisma.userProfile.findUnique({
          where: { userId: user.id },
          select: { isSuperAdmin: true },
        });

        // Only super admins can create schools
        return profile?.isSuperAdmin ?? false;
      },

      // Organization structure
      organizationLimit: 100, // Super admin can access up to 100 schools

      // Member invitation
      sendInvitationEmail: async (data) => {
        // Implement email sending logic
        console.log("Sending invitation to:", data.email);

        // Example with nodemailer or resend:
        // await sendEmail({
        //   to: data.email,
        //   subject: `Invitation to join ${data.organizationName}`,
        //   html: `Click here to accept: ${data.invitationLink}`,
        // });
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
