// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [organizationClient(), adminClient()],
});

// Core auth exports
export const { signIn, signUp, signOut, useSession, organization, admin } =
  authClient;
