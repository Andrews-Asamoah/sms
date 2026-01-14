// lib/auth/types.ts - REFACTORED for Better Auth
import { Prisma, MemberRole } from "@/lib/generated/prisma/client";

// ============================================================
// PROFILE INCLUDES
// ============================================================

export const profileInclude = {
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
} satisfies Prisma.UserProfileInclude;

export const membershipInclude = {
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
} satisfies Prisma.MemberInclude;

// ============================================================
// DERIVED TYPES
// ============================================================

export type ProfileWithRelations = Prisma.UserProfileGetPayload<{
  include: typeof profileInclude;
}>;

export type MembershipWithRelations = Prisma.MemberGetPayload<{
  include: typeof membershipInclude;
}>;

// ============================================================
// BETTER AUTH SESSION TYPE
// ============================================================

export interface BetterAuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
    role?: string; // System role: 'superAdmin' or 'user'
    banned?: boolean;
    banReason?: string | null;
    banExpires?: Date | null;
  };
  session: {
    id: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    impersonatedBy?: string | null;
    userId: string;
    activeOrganizationId?: string | null;
  };
}

// ============================================================
// EXTENDED SESSION (Our Custom Type)
// ============================================================

export interface ExtendedSession {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
    role: string; // System role: 'superAdmin' or 'user'
    banned: boolean;
    banReason?: string | null;
    banExpires?: Date | null;
  };
  session: {
    id: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    impersonatedBy?: string | null;
    userId: string;
    activeOrganizationId?: string | null;
  };
  profile: ProfileWithRelations | null;
  memberships: MembershipWithRelations[];
  isSuperAdmin: boolean;
  isAdmin: boolean; // True if user is OWNER/ADMIN in any org OR superAdmin
}

// ============================================================
// SCHOOL ACCESS TYPE
// ============================================================

/**
 * Represents a user's access to a specific school
 * Combines organization role + profile role
 */
export interface SchoolAccess {
  schoolId: string;
  schoolName: string;
  subdomain: string;
  organizationId: string;

  // Organization role from Better Auth Member table
  organizationRole?: MemberRole; // 'OWNER' | 'ADMIN' | 'MEMBER'

  // Profile-based role (what they actually do in the school)
  profileRoles: Array<
    "teacher" | "student" | "staff" | "accountant" | "guardian"
  >;

  // Effective role for permissions (highest priority)
  effectiveRole:
    | "owner"
    | "admin"
    | "teacher"
    | "accountant"
    | "staff"
    | "student"
    | "guardian"
    | "member";

  isActive: boolean;
}

// ============================================================
// ROLE ENUMS (Deprecated - use MemberRole from Prisma)
// ============================================================

/**
 * System-wide roles (User.role field)
 * @deprecated Use string literals instead
 */
export enum SystemRole {
  SUPER_ADMIN = "superAdmin",
  USER = "user",
}

/**
 * Profile-based roles (derived from UserProfile relations)
 * @deprecated Use string literals instead
 */
export enum ProfileRole {
  TEACHER = "teacher",
  STUDENT = "student",
  STAFF = "staff",
  ACCOUNTANT = "accountant",
  GUARDIAN = "guardian",
}

// ============================================================
// PERMISSION CHECK TYPES
// ============================================================

export interface PermissionCheck {
  resource: string;
  actions: string[];
}

export interface PermissionResult {
  success: boolean;
  message?: string;
}

// ============================================================
// ROLE PRIORITY (for determining effective role)
// ============================================================

export const ROLE_PRIORITY = {
  superAdmin: 100, // System-wide
  owner: 90, // Organization OWNER
  admin: 80, // Organization ADMIN
  teacher: 50, // Profile role
  accountant: 40, // Profile role (staff with ACCOUNTANT type)
  staff: 30, // Profile role
  guardian: 20, // Profile role
  student: 10, // Profile role
  member: 5, // Organization MEMBER (no specific profile)
  user: 0, // Default
} as const;

export type RoleType = keyof typeof ROLE_PRIORITY;

// Effective roles that can be assigned to SchoolAccess
export type EffectiveRole =
  | "owner"
  | "admin"
  | "teacher"
  | "accountant"
  | "staff"
  | "student"
  | "guardian"
  | "member";

// Profile-based roles only
export type ProfileRoleType =
  | "teacher"
  | "student"
  | "staff"
  | "accountant"
  | "guardian";
