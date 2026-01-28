// lib/auth-client.ts - CORRECTED with actual Better Auth method names
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

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

const AUTH_BASE_URL = process.env.NEXT_PUBLIC_APP_URL;

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
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

// ============================================================================
// TYPES
// ============================================================================

export type RoleName =
  | "superAdmin"
  | "admin"
  | "teacher"
  | "accountant"
  | "student"
  | "guardian"
  | "user";

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

export interface AuthResult<T = unknown> {
  data?: T;
  error?: AuthError;
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

/**
 * Check user permissions (async, requires server call)
 * @param permissions - Object mapping resources to allowed actions
 * @returns Promise<boolean> - Whether user has the required permissions
 * @example
 * const canDelete = await hasPermission({ user: ["delete"] });
 */
export async function hasPermission(
  permissions: Record<string, string[]>,
): Promise<boolean> {
  try {
    const result = await authClient.admin.hasPermission({
      permissions,
    });
    return Boolean(result.data?.success);
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}

/**
 * Check role permissions (synchronous, no server call)
 * @param role - Role name to check
 * @param permissions - Object mapping resources to allowed actions
 * @returns boolean - Whether role has the required permissions
 * @example
 * const canDelete = checkRolePermission("admin", { user: ["delete"] });
 */
export function checkRolePermission(
  role: RoleName,
  permissions: Record<string, string[]>,
): boolean {
  return authClient.admin.checkRolePermission({
    role,
    permissions,
  });
}

// ============================================================================
// AUTHENTICATION METHODS (Direct exports from authClient)
// ============================================================================

/**
 * Core authentication methods
 * These are direct exports from Better Auth's client
 */
export const {
  // Authentication
  signIn,
  signUp,
  signOut,

  // Password Management - CORRECTED METHOD NAMES
  requestPasswordReset, // ✅ This is the correct method name
  resetPassword,
  changePassword,

  // Email Verification
  sendVerificationEmail,

  // Session Management
  useSession,
  getSession,

  // Organization Management
  organization,

  // Admin Functions
  admin,
} = authClient;

// ============================================================================
// CONVENIENCE WRAPPER (Optional - for consistent API)
// ============================================================================

/**
 * Unified auth object that combines all authentication methods
 * Provides a consistent interface for all auth operations
 */
export const auth = {
  // Core authentication
  signIn: authClient.signIn,
  signUp: authClient.signUp,
  signOut: authClient.signOut,

  // Password management - CORRECTED METHOD NAMES
  requestPasswordReset: authClient.requestPasswordReset, // ✅ Correct
  resetPassword: authClient.resetPassword,
  changePassword: authClient.changePassword,

  // Email verification
  sendVerificationEmail: authClient.sendVerificationEmail,

  // Session management
  useSession: authClient.useSession,
  getSession: authClient.getSession,

  // Organization management
  organization: authClient.organization,

  // Admin functions
  admin: authClient.admin,

  // Permission helpers
  hasPermission,
  checkRolePermission,
} as const;

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default authClient;
