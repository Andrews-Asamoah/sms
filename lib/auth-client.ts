// lib/auth/client.ts - REFACTORED with correct method names and types
"use client";

import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  organizationClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
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
} from "@/lib/auth/permissions";
import type { auth as AuthServer } from "@/lib/auth";

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
  plugins: [
    adminClient({
      ac,
      roles: {
        superAdmin,
        owner,
        admin: adminRole,
        teacher,
        headteacher,
        accountant,
        student,
        guardian,
        member: memberRole,
        user: userRole,
      },
    }),
    organizationClient({
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
      },
      dynamicAccessControl: {
        enabled: true,
      },
    }),
    inferAdditionalFields<typeof AuthServer>(),
  ],
});

// ============================================================================
// TYPES
// ============================================================================

export type RoleName =
  | "superAdmin"
  | "owner"
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
// AUTHENTICATION METHODS
// ============================================================================

/**
 * Sign in with email and password
 */
export const signIn = authClient.signIn;

/**
 * Sign up a new user
 */
export const signUp = authClient.signUp;

/**
 * Sign out current user
 */
export const signOut = authClient.signOut;

/**
 * Request a password reset email
 * @param email - User's email address
 * @example
 * const result = await requestPasswordReset({ email: "user@example.com" });
 */
export const forgetPassword = authClient.requestPasswordReset;

/**
 * Reset password with token
 * @param token - Reset token from email
 * @param newPassword - New password
 * @example
 * const result = await resetPassword({ token, newPassword: "newpass123" });
 */
export const resetPassword = authClient.resetPassword;

/**
 * Change password for authenticated user
 * @param currentPassword - Current password
 * @param newPassword - New password
 * @example
 * const result = await changePassword({
 *   currentPassword: "oldpass",
 *   newPassword: "newpass123"
 * });
 */
export const changePassword = authClient.changePassword;

/**
 * Send email verification
 */
export const sendVerificationEmail = authClient.sendVerificationEmail;

/**
 * Verify email with token
 */
export const verifyEmail = authClient.verifyEmail;

// ============================================================================
// SESSION HOOKS
// ============================================================================

/**
 * Hook to access current session
 * @returns Session data, loading state, and error
 * @example
 * const { data: session, isPending, error } = useSession();
 */
export const useSession = authClient.useSession;

/**
 * Get current session (client-side)
 */
export const getSession = authClient.getSession;

/**
 * Update session
 */
export const updateSession = authClient.updateUser;

// ============================================================================
// ORGANIZATION METHODS
// ============================================================================

/**
 * Organization management object
 * @example
 * // Create organization
 * const result = await organization.create({ name: "My School", slug: "my-school" });
 *
 * // List organizations
 * const orgs = await organization.list();
 *
 * // Get active organization
 * const active = await organization.getActive();
 *
 * // Set active organization
 * await organization.setActive({ organizationId: "org_123" });
 *
 * // Invite member
 * await organization.inviteMember({
 *   email: "teacher@school.com",
 *   role: "teacher",
 * });
 */
export const organization = authClient.organization;

// ============================================================================
// ADMIN METHODS
// ============================================================================

/**
 * Admin management object
 * @example
 * // List users
 * const users = await admin.listUsers();
 *
 * // Ban user
 * await admin.banUser({ userId: "user_123" });
 *
 * // Set user role
 * await admin.setRole({ userId: "user_123", role: "admin" });
 *
 * // Check permission
 * const canDelete = await admin.hasPermission({
 *   permissions: { user: ["delete"] }
 * });
 */
export const admin = authClient.admin;

// ============================================================================
// CONVENIENCE WRAPPER
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

  // Password management
  forgetPassword: authClient.requestPasswordReset,
  resetPassword: authClient.resetPassword,
  changePassword: authClient.changePassword,

  // Email verification
  sendVerificationEmail: authClient.sendVerificationEmail,
  verifyEmail: authClient.verifyEmail,

  // Session management
  useSession: authClient.useSession,
  getSession: authClient.getSession,
  updateUser: authClient.updateUser,

  // Organization management
  organization: authClient.organization,

  // Admin functions
  admin: authClient.admin,

  // Permission helpers
  hasPermission,
  checkRolePermission,
} as const;

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Custom hook to get user with additional helpers
 * @example
 * const { user, isAuthenticated, isLoading, isSuperAdmin } = useUser();
 */
export function useUser() {
  const { data: session, isPending, error } = useSession();

  return {
    user: session?.user,
    session: session?.session,
    isAuthenticated: !!session?.user,
    isLoading: isPending,
    error,
    isSuperAdmin: session?.user?.role === "superAdmin",
    isAdmin:
      session?.user?.role === "superAdmin" || session?.user?.role === "admin",
  };
}

/**
 * Custom hook to get active organization
 * @example
 * const { organization, isLoading, setActive } = useActiveOrganization();
 */
export function useActiveOrganization() {
  const { data: session } = useSession();

  const setActive = async (organizationId: string) => {
    await organization.setActive({ organizationId });
  };

  return {
    organizationId: session?.session?.activeOrganizationId,
    setActive,
  };
}

/**
 * Custom hook to check if user has permission
 * @example
 * const { hasPermission, isLoading } = usePermission({ user: ["delete"] });
 */
export function usePermission(permissions: Record<string, string[]>) {
  const [isChecking, setIsChecking] = React.useState(false);
  const [allowed, setAllowed] = React.useState(false);

  React.useEffect(() => {
    setIsChecking(true);
    hasPermission(permissions)
      .then(setAllowed)
      .finally(() => setIsChecking(false));
  }, [permissions]);

  return {
    hasPermission: allowed,
    isLoading: isChecking,
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default authClient;

// For React imports
import * as React from "react";
