// lib/auth/types.ts

import type { User } from "better-auth/types";
import type { Prisma } from "@/lib/generated/prisma/client";

// ============================================================================
// PRISMA INCLUDE CONFIGURATIONS
// ============================================================================

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
} as const satisfies Prisma.UserProfileInclude;

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
} as const satisfies Prisma.memberInclude;

// ============================================================================
// INFERRED TYPES FROM PRISMA QUERIES
// ============================================================================

export type UserProfileWithRelations = Prisma.UserProfileGetPayload<{
  include: typeof profileInclude;
}>;

export type MembershipWithOrganization = Prisma.memberGetPayload<{
  include: typeof membershipInclude;
}>;

// ============================================================================
// EXTENDED USER TYPE
// ============================================================================

export interface ExtendedUser extends User {
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
}

// ============================================================================
// EXTENDED SESSION OBJECT TYPE
// ============================================================================

export interface ExtendedSessionObject {
  id: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  impersonatedBy: string | null;
  userId: string;
  activeOrganizationId: string | null;
}

// ============================================================================
// MAIN EXTENDED SESSION TYPE
// ============================================================================

/**
 * Extended session that includes profile and organization data
 * This is what getAuthSession() and getEnhancedSession() return
 */
export interface ExtendedSession {
  user: ExtendedUser;
  session: ExtendedSessionObject;
  profile: UserProfileWithRelations | null;
  memberships: MembershipWithOrganization[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isOwner: boolean;
}

// ============================================================================
// ROLE TYPE DEFINITIONS
// ============================================================================

export type SystemRole = "superAdmin" | "user";

export type OrganizationRole =
  | "owner"
  | "admin"
  | "member"
  | "teacher"
  | "headteacher"
  | "accountant"
  | "guardian"
  | "student";

export type ProfileRoleType =
  | "admin"
  | "teacher"
  | "headteacher"
  | "student"
  | "guardian"
  | "accountant";

export type EffectiveRole =
  | "owner"
  | "admin"
  | "headteacher"
  | "teacher"
  | "accountant"
  | "student"
  | "guardian"
  | "member";

// ============================================================================
// SCHOOL ACCESS TYPE
// ============================================================================

export interface SchoolAccess {
  schoolId: string;
  schoolName: string;
  subdomain: string;
  organizationId: string;
  organizationRole: OrganizationRole | undefined;
  profileRoles: ProfileRoleType[];
  effectiveRole: EffectiveRole;
  isActive: boolean;
}

// ============================================================================
// NAVIGATION PERMISSIONS
// ============================================================================

export interface NavPermissions {
  canViewDashboard: boolean;
  canViewAnalytics: boolean;
  canManageStudents: boolean;
  canManageTeachers: boolean;
  canManageStaff: boolean;
  canManageParents: boolean;
  canManageClasses: boolean;
  canManageSubjects: boolean;
  canManageDepartments: boolean;
  canManageHouses: boolean;
  canManageGrading: boolean;
  canViewReports: boolean;
  canManageAttendance: boolean;
  canManageAcademicYear: boolean;
  canViewFinance: boolean; // NEW: View-only access
  canManageFinance: boolean;
  canManageDocuments: boolean;
  canViewTimetable: boolean;
  canViewHostel: boolean;
  canViewLibrary: boolean;
  canViewInventory: boolean;
  canViewTransport: boolean;
  canManageAnnouncements: boolean;
  canViewCommunications: boolean;
  canViewProfile: boolean;
  canManageSettings: boolean;
  canViewSupport: boolean;
}

// ============================================================================
// AUTH FORM DATA TYPES
// ============================================================================

export interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}

export interface SignupFormData {
  email: string;
  password: string;
  name: string;
  firstName?: string;
  lastName?: string;
}

export interface InvitationData {
  email: string;
  schoolName: string;
  schoolLogo?: string | null;
  inviterName: string;
  role: string;
  invitationId: string;
  organizationId: string;
}

export interface PasswordResetFormData {
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

// ============================================================================
// AUTH RESPONSE TYPES
// ============================================================================

export interface AuthResponse<T = unknown> {
  data?: T;
  error?: AuthError;
}

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "PAYMENT_RECORDED"
  | "BILL_GENERATED"
  | "GRADE_ENTERED"
  | "ATTENDANCE_MARKED";

export interface AuditLogData {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ============================================================================
// ROLE PRIORITY MAPPING
// ============================================================================

/**
 * Role priority for determining effective role when user has multiple roles
 * Higher number = higher priority
 */
export const ROLE_PRIORITY: Record<EffectiveRole, number> = {
  owner: 100,
  admin: 90,
  headteacher: 85,
  accountant: 70,
  teacher: 60,
  guardian: 40,
  student: 30,
  member: 10,
} as const;

// ============================================================================
// ENUM RE-EXPORTS
// ============================================================================

export {
  StudentStatus,
  EmploymentType,
  GuardianType,
  StaffType,
} from "@/lib/generated/prisma/client";
