// lib/auth/utils.ts - Consolidated Auth Utilities

import type { ExtendedSession, EffectiveRole, ProfileRoleType } from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

export type RoleName =
  | "superAdmin"
  | "owner"
  | "admin"
  | "headteacher"
  | "teacher"
  | "accountant"
  | "student"
  | "guardian"
  | "staff"
  | "user";

export const ROLES: readonly RoleName[] = [
  "superAdmin",
  "owner",
  "admin",
  "headteacher",
  "teacher",
  "accountant",
  "student",
  "guardian",
  "staff",
  "user",
] as const;

export const ROLE_DISPLAY_NAMES: Record<RoleName, string> = {
  superAdmin: "Super Administrator",
  owner: "School Owner",
  admin: "Administrator",
  headteacher: "Head Teacher",
  teacher: "Teacher",
  accountant: "Accountant",
  student: "Student",
  guardian: "Parent/Guardian",
  staff: "Staff",
  user: "User",
} as const;

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  superAdmin: "Full platform access and school creation",
  owner: "Full access to their school",
  admin: "Day-to-day school operations management",
  headteacher: "Academic and administrative head of the school",
  teacher: "Classroom management and student assessment",
  accountant: "Financial management and reporting",
  student: "View own academic information",
  guardian: "View children's information and make payments",
  staff: "Department-specific access",
  user: "Basic authenticated user",
} as const;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate organization slug format
 * Rules: lowercase alphanumeric + hyphens, 3-20 chars, no leading/trailing hyphens
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9-]+$/;
  return (
    slugRegex.test(slug) &&
    !slug.startsWith("-") &&
    !slug.endsWith("-") &&
    slug.length >= 3 &&
    slug.length <= 20
  );
}

/**
 * Generate a URL-safe slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 20);
}

/**
 * Generate a school code from name (abbreviation)
 */
export function generateSchoolCode(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 10);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface AuthError {
  message: string;
  status: number;
  code?: string;
}

/**
 * Standardized error handler for Better Auth errors
 */
export function handleAuthError(error: unknown): AuthError {
  if (error instanceof Error) {
    // Better Auth specific errors
    if (error.message.includes("not allowed to create organization")) {
      return {
        message: "You don't have permission to create organizations",
        status: 403,
        code: "FORBIDDEN",
      };
    }

    if (error.message.includes("not authenticated")) {
      return {
        message: "You must be logged in to perform this action",
        status: 401,
        code: "UNAUTHORIZED",
      };
    }

    if (error.message.includes("organization not found")) {
      return {
        message: "Organization not found",
        status: 404,
        code: "NOT_FOUND",
      };
    }

    if (error.message.includes("already exists")) {
      return {
        message: "Resource already exists",
        status: 409,
        code: "CONFLICT",
      };
    }

    // Generic error
    return {
      message: error.message,
      status: 500,
      code: "INTERNAL_ERROR",
    };
  }

  return {
    message: "An unknown error occurred",
    status: 500,
    code: "UNKNOWN_ERROR",
  };
}

// ============================================================================
// ROLE UTILITIES
// ============================================================================

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: RoleName): string {
  return ROLE_DISPLAY_NAMES[role] || role;
}

/**
 * Get description for a role
 */
export function getRoleDescription(role: RoleName): string {
  return ROLE_DESCRIPTIONS[role] || "No description available";
}

/**
 * Check if a role has higher or equal priority than another
 */
export function hasHigherOrEqualRole(
  userRole: RoleName,
  requiredRole: RoleName,
): boolean {
  const roleIndex = ROLES.indexOf(userRole);
  const requiredIndex = ROLES.indexOf(requiredRole);
  return roleIndex <= requiredIndex;
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(session: ExtendedSession | null): boolean {
  return session?.isSuperAdmin ?? false;
}

/**
 * Check if user is an admin (owner or admin role in any school)
 */
export function isAdmin(session: ExtendedSession | null): boolean {
  return session?.isAdmin ?? false;
}

// ============================================================================
// SESSION UTILITIES
// ============================================================================

/**
 * Check if user has a valid session
 */
export function hasValidSession(session: ExtendedSession | null): boolean {
  return !!session?.user;
}

/**
 * Check if user's email is verified
 */
export function isEmailVerified(session: ExtendedSession | null): boolean {
  return session?.user?.emailVerified ?? false;
}

/**
 * Check if user is banned
 */
export function isBanned(session: ExtendedSession | null): boolean {
  return session?.user?.banned ?? false;
}

/**
 * Get ban expiry date if user is banned
 */
export function getBanExpiry(session: ExtendedSession | null): Date | null {
  if (!session?.user?.banned) return null;
  return session.user.banExpires;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a string is a valid RoleName
 */
export function isValidRoleName(role: string): role is RoleName {
  return ROLES.includes(role as RoleName);
}

/**
 * Type guard to check if a string is a valid EffectiveRole
 */
export function isEffectiveRole(role: string): role is EffectiveRole {
  const effectiveRoles: EffectiveRole[] = [
    "owner",
    "admin",
    "headteacher",
    "teacher",
    "accountant",
    "staff",
    "student",
    "guardian",
    "member",
    "staff",
  ];
  return effectiveRoles.includes(role as EffectiveRole);
}

/**
 * Type guard to check if a string is a valid ProfileRoleType
 */
export function isProfileRole(role: string): role is ProfileRoleType {
  const profileRoles: ProfileRoleType[] = [
    "headteacher",
    "teacher",
    "student",
    "guardian",
    "accountant",
    "staff",
  ];
  return profileRoles.includes(role as ProfileRoleType);
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format user's full name from session
 */
export function getFullName(session: ExtendedSession | null): string {
  if (!session?.user) return "Unknown User";

  if (session.profile) {
    const { firstName, lastName, otherNames } = session.profile;
    return [firstName, otherNames, lastName].filter(Boolean).join(" ");
  }

  return session.user.name || session.user.email;
}

/**
 * Format user's initials
 */
export function getInitials(session: ExtendedSession | null): string {
  const name = getFullName(session);
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const AuthUtils = {
  // Validation
  isValidSlug,
  generateSlug,
  generateSchoolCode,

  // Error handling
  handleAuthError,

  // Role utilities
  getRoleDisplayName,
  getRoleDescription,
  hasHigherOrEqualRole,
  isSuperAdmin,
  isAdmin,

  // Session utilities
  hasValidSession,
  isEmailVerified,
  isBanned,
  getBanExpiry,

  // Type guards
  isValidRoleName,
  isEffectiveRole,
  isProfileRole,

  // Formatting
  getFullName,
  getInitials,
} as const;
