// lib/auth-client.ts - IMPROVED with Better Type Safety
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

export type RoleName =
  | "superAdmin"
  | "admin"
  | "teacher"
  | "accountant"
  | "student"
  | "guardian"
  | "user";

export async function hasPermission(
  permissions: Record<string, string[]>
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
 * Usage: const canDelete = checkRolePermission("admin", { user: ["delete"] })
 */
export function checkRolePermission(
  role: RoleName,
  permissions: Record<string, string[]>
): boolean {
  return authClient.admin.checkRolePermission({
    role,
    permissions,
  });
}

// Core auth exports (recommended by better-auth)
export const { signIn, signUp, signOut, useSession, organization, admin } =
  authClient;

/**
 * Additional auth methods for convenience
 */

/**
 * Request password reset
 * Usage: await forgetPassword({ email: "user@example.com", redirectTo: "/reset-password" })
 */
export async function forgetPassword(params: {
  email: string;
  redirectTo: string;
}): Promise<{ error?: { message: string } }> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/forget-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        redirectTo: params.redirectTo,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        error: { message: error.message || "Failed to send reset email" },
      };
    }

    return {};
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Network error";
    return { error: { message: errorMessage } };
  }
}

/**
 * Reset password with token
 * Usage: await resetPassword({ token: "...", newPassword: "..." })
 */
export async function resetPassword(params: {
  token: string;
  newPassword: string;
}): Promise<{ error?: { message: string } }> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: params.token,
        newPassword: params.newPassword,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        error: { message: error.message || "Failed to reset password" },
      };
    }

    return {};
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Network error";
    return { error: { message: errorMessage } };
  }
}

/**
 * Change password (for authenticated users)
 * Usage: await changePassword({ currentPassword: "...", newPassword: "..." })
 */
export async function changePassword(params: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ error?: { message: string } }> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword: params.currentPassword,
        newPassword: params.newPassword,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        error: { message: error.message || "Failed to change password" },
      };
    }

    return {};
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Network error";
    return { error: { message: errorMessage } };
  }
}

/**
 * Verify email with token
 * Usage: await verifyEmail({ token: "..." })
 */
export async function verifyEmail(params: {
  token: string;
}): Promise<{ error?: { message: string } }> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: params.token,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: { message: error.message || "Failed to verify email" } };
    }

    return {};
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Network error";
    return { error: { message: errorMessage } };
  }
}

/**
 * Export wrapped authClient methods with proper typing
 */
export const auth = {
  ...authClient,
  // Add custom methods
  forgetPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  // Re-export core methods for convenience
  signIn: authClient.signIn,
  signUp: authClient.signUp,
  signOut: authClient.signOut,
  useSession: authClient.useSession,
  organization: authClient.organization,
  admin: authClient.admin,
};

// Export types for Better Auth responses
export type AuthError = {
  message: string;
  code?: string;
};

export type AuthResult<T = unknown> = {
  data?: T;
  error?: AuthError;
};
