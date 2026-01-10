// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";
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

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    adminClient({
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
    }),
    organizationClient(),
  ],
});

/**
 * Type-safe role names for checking
 */
export type RoleName =
  | "superAdmin"
  | "admin"
  | "teacher"
  | "accountant"
  | "student"
  | "guardian"
  | "user";

/**
 * Helper hooks and utilities for client-side permission checks
 */

/**
 * Check if current user has specific permissions
 * Usage: const canCreate = await hasPermission({ school: ["create"] })
 */
export async function hasPermission(permissions: Record<string, string[]>) {
  try {
    const { data } = await authClient.admin.hasPermission({
      permissions,
    });
    return data ?? false;
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}

/**
 * Check role permissions (synchronous, no server call)
 * Usage: const canDelete = checkRolePermission("admin", { user: ["delete"] })
 */
export function checkRolePermission(
  role: RoleName,
  permissions: Record<string, string[]>
) {
  return authClient.admin.checkRolePermission({
    role,
    permissions,
  });
}

// Core auth exports (recommended by better-auth)
export const { signIn, signUp, signOut, useSession, organization, admin } =
  authClient;
