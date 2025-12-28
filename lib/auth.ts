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
      // Organization creators can add members by default
      allowUserToCreateOrganization: true,

      // Organization structure
      organizationLimit: 100, // Super admin can access up to 100 schools

      // Member invitation
      sendInvitationEmail: async (data) => {
        // Implement email sending logic
        console.log("Sending invitation to:", data.email);
      },
    }),
  ],

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
  },
});
