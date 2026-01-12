// ============================================================
// lib/permissions/utils.ts
// Fixed version that works with Better Auth
// ============================================================

import type { statement } from "../permissions";

export type BetterAuthRole =
  | "superAdmin"
  | "owner"
  | "admin"
  | "member"
  | "teacher"
  | "student"
  | "guardian"
  | "staff"
  | "accountant"
  | "user";

/**
 * Convert Better Auth organization role to our role system
 */
export function mapOrganizationRole(orgRole: string): BetterAuthRole {
  const roleMap: Record<string, BetterAuthRole> = {
    OWNER: "owner",
    ADMIN: "admin",
    MEMBER: "member",
  };
  return roleMap[orgRole] || "member";
}

/**
 * Normalize display role string to BetterAuthRole
 */
export function normalizeRole(role: string): BetterAuthRole {
  const normalizedRole = role.toLowerCase().replace(/[^a-z]/g, "");

  switch (normalizedRole) {
    case "superadmin":
      return "superAdmin";
    case "owner":
      return "owner";
    case "administrator":
    case "admin":
      return "admin";
    case "member":
      return "member";
    case "teacher":
      return "teacher";
    case "student":
      return "student";
    case "parentguardian":
    case "guardian":
    case "parent":
      return "guardian";
    case "staff":
      return "staff";
    case "accountant":
      return "accountant";
    default:
      return "user";
  }
}

/**
 * Define permissions for each role manually
 * This avoids TypeScript issues with Better Auth's complex types
 */
type Resource = keyof typeof statement;
type Action = string;

const rolePermissionsMap: Record<BetterAuthRole, Record<Resource, Action[]>> = {
  superAdmin: {
    user: [
      "list",
      "create",
      "update",
      "delete",
      "ban",
      "unban",
      "impersonate",
      "set-role",
    ],
    session: ["list", "create", "update", "delete", "revoke"],
    school: ["create", "update", "delete", "view", "manage"],
    student: ["create", "update", "delete", "view", "enroll"],
    teacher: ["create", "update", "delete", "view", "assign"],
    staff: ["create", "update", "delete", "view"],
    parent: ["create", "update", "delete", "view"],
    class: ["create", "update", "delete", "view", "manage"],
    subject: ["create", "update", "delete", "view"],
    department: ["create", "update", "delete", "view"],
    house: ["create", "update", "delete", "view"],
    finance: ["create", "update", "delete", "view", "approve"],
    assessment: ["create", "update", "delete", "view", "grade"],
    attendance: ["create", "update", "delete", "view", "approve"],
    report: ["create", "view", "download", "approve"],
    document: ["create", "update", "delete", "view", "upload"],
    announcement: ["create", "update", "delete", "view"],
    setting: ["view", "update"],
    analytics: ["view"],
    timetable: ["create", "update", "delete", "view"],
    hostel: ["create", "update", "delete", "view"],
    library: ["create", "update", "delete", "view"],
    inventory: ["create", "update", "delete", "view"],
    transport: ["create", "update", "delete", "view"],
    communication: ["view", "send"],
  },
  owner: {
    user: ["list", "ban", "set-role"],
    session: ["list", "revoke"],
    school: ["update", "view", "manage"],
    student: ["create", "update", "delete", "view", "enroll"],
    teacher: ["create", "update", "delete", "view", "assign"],
    staff: ["create", "update", "delete", "view"],
    parent: ["create", "update", "delete", "view"],
    class: ["create", "update", "delete", "view", "manage"],
    subject: ["create", "update", "delete", "view"],
    department: ["create", "update", "delete", "view"],
    house: ["create", "update", "delete", "view"],
    finance: ["create", "update", "delete", "view", "approve"],
    assessment: ["create", "update", "delete", "view", "grade"],
    attendance: ["create", "update", "delete", "view", "approve"],
    report: ["create", "view", "download", "approve"],
    document: ["create", "update", "delete", "view", "upload"],
    announcement: ["create", "update", "delete", "view"],
    setting: ["view", "update"],
    analytics: ["view"],
    timetable: ["create", "update", "delete", "view"],
    hostel: ["create", "update", "delete", "view"],
    library: ["create", "update", "delete", "view"],
    inventory: ["create", "update", "delete", "view"],
    transport: ["create", "update", "delete", "view"],
    communication: ["view", "send"],
  },
  admin: {
    user: ["list", "ban", "set-role"],
    session: ["list", "revoke"],
    school: ["update", "view", "manage"],
    student: ["create", "update", "delete", "view", "enroll"],
    teacher: ["create", "update", "delete", "view", "assign"],
    staff: ["create", "update", "delete", "view"],
    parent: ["create", "update", "delete", "view"],
    class: ["create", "update", "delete", "view", "manage"],
    subject: ["create", "update", "delete", "view"],
    department: ["create", "update", "delete", "view"],
    house: ["create", "update", "delete", "view"],
    finance: ["view"],
    assessment: ["create", "update", "delete", "view", "grade"],
    attendance: ["create", "update", "delete", "view", "approve"],
    report: ["create", "view", "download", "approve"],
    document: ["create", "update", "delete", "view", "upload"],
    announcement: ["create", "update", "delete", "view"],
    setting: ["view"],
    analytics: ["view"],
    timetable: ["create", "update", "delete", "view"],
    hostel: ["create", "update", "delete", "view"],
    library: ["create", "update", "delete", "view"],
    inventory: ["create", "update", "delete", "view"],
    transport: ["create", "update", "delete", "view"],
    communication: ["view", "send"],
  },
  member: {
    user: [],
    session: [],
    school: ["view"],
    student: ["view"],
    teacher: ["view"],
    staff: [],
    parent: [],
    class: ["view"],
    subject: [],
    department: [],
    house: [],
    finance: [],
    assessment: [],
    attendance: [],
    report: ["view"],
    document: ["view", "upload"],
    announcement: [],
    setting: [],
    analytics: [],
    timetable: ["view"],
    hostel: [],
    library: ["view"],
    inventory: [],
    transport: [],
    communication: ["view"],
  },
  teacher: {
    user: [],
    session: [],
    school: [],
    student: ["view", "enroll"],
    teacher: ["view"],
    staff: [],
    parent: [],
    class: ["view"],
    subject: [],
    department: [],
    house: [],
    finance: ["view"],
    assessment: ["create", "update", "view", "grade"],
    attendance: ["create", "update", "view"],
    report: ["create", "view"],
    document: ["view", "upload"],
    announcement: [],
    setting: [],
    analytics: [],
    timetable: ["view"],
    hostel: [],
    library: ["view"],
    inventory: [],
    transport: [],
    communication: ["view", "send"],
  },
  student: {
    user: [],
    session: [],
    school: [],
    student: ["view"],
    teacher: [],
    staff: [],
    parent: [],
    class: [],
    subject: [],
    department: [],
    house: [],
    finance: ["view"],
    assessment: ["view"],
    attendance: ["view"],
    report: ["view"],
    document: [],
    announcement: [],
    setting: [],
    analytics: [],
    timetable: ["view"],
    hostel: ["view"],
    library: ["view"],
    inventory: [],
    transport: ["view"],
    communication: ["view"],
  },
  guardian: {
    user: [],
    session: [],
    school: [],
    student: ["view"],
    teacher: [],
    staff: [],
    parent: [],
    class: [],
    subject: [],
    department: [],
    house: [],
    finance: ["view", "create"],
    assessment: ["view"],
    attendance: ["view"],
    report: ["view"],
    document: [],
    announcement: [],
    setting: [],
    analytics: [],
    timetable: ["view"],
    hostel: [],
    library: [],
    inventory: [],
    transport: ["view"],
    communication: ["view"],
  },
  staff: {
    user: [],
    session: [],
    school: [],
    student: [],
    teacher: [],
    staff: [],
    parent: [],
    class: [],
    subject: [],
    department: [],
    house: [],
    finance: [],
    assessment: [],
    attendance: [],
    report: [],
    document: ["view", "upload"],
    announcement: [],
    setting: [],
    analytics: [],
    timetable: [],
    hostel: ["view"],
    library: ["view"],
    inventory: ["view"],
    transport: ["view"],
    communication: ["view"],
  },
  accountant: {
    user: [],
    session: [],
    school: [],
    student: ["view"],
    teacher: [],
    staff: [],
    parent: [],
    class: [],
    subject: [],
    department: [],
    house: [],
    finance: ["create", "update", "view", "approve"],
    assessment: [],
    attendance: [],
    report: ["create", "view", "download"],
    document: ["view", "upload"],
    announcement: [],
    setting: [],
    analytics: ["view"],
    timetable: [],
    hostel: [],
    library: [],
    inventory: [],
    transport: [],
    communication: [],
  },
  user: {
    user: ["list"],
    session: [],
    school: [],
    student: [],
    teacher: [],
    staff: [],
    parent: [],
    class: [],
    subject: [],
    department: [],
    house: [],
    finance: [],
    assessment: [],
    attendance: [],
    report: [],
    document: [],
    announcement: [],
    setting: [],
    analytics: [],
    timetable: [],
    hostel: [],
    library: [],
    inventory: [],
    transport: [],
    communication: [],
  },
};

/**
 * Check if user has permission for a specific action
 */
export function hasPermission(
  role: string,
  resource: Resource,
  action: string
): boolean {
  const normalizedRole = normalizeRole(role);
  const permissions = rolePermissionsMap[normalizedRole];

  if (!permissions || !permissions[resource]) {
    return false;
  }

  return permissions[resource].includes(action);
}

/**
 * Navigation permissions mapped to Better Auth permissions
 */
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
  canManageFinance: boolean;
  canManageDocuments: boolean;
  canManageAnnouncements: boolean;
  canManageSettings: boolean;
  canViewSupport: boolean;
  canManageUsers: boolean;
  canViewProfile: boolean;
  canViewTimetable: boolean;
  canViewHostel: boolean;
  canViewLibrary: boolean;
  canViewInventory: boolean;
  canViewTransport: boolean;
  canViewCommunications: boolean;
}

/**
 * Convert Better Auth permissions to navigation permissions
 */
export function getNavigationPermissions(role: string): NavPermissions {
  return {
    canViewDashboard: true, // Everyone can view their dashboard
    canViewAnalytics: hasPermission(role, "analytics", "view"),
    canManageStudents: hasPermission(role, "student", "create"),
    canManageTeachers: hasPermission(role, "teacher", "create"),
    canManageStaff: hasPermission(role, "staff", "create"),
    canManageParents: hasPermission(role, "parent", "create"),
    canManageClasses: hasPermission(role, "class", "create"),
    canManageSubjects: hasPermission(role, "subject", "create"),
    canManageDepartments: hasPermission(role, "department", "create"),
    canManageHouses: hasPermission(role, "house", "create"),
    canManageGrading: hasPermission(role, "assessment", "grade"),
    canViewReports: hasPermission(role, "report", "view"),
    canManageAttendance: hasPermission(role, "attendance", "create"),
    canManageAcademicYear: hasPermission(role, "school", "manage"),
    canManageFinance: hasPermission(role, "finance", "create"),
    canManageDocuments: hasPermission(role, "document", "upload"),
    canManageAnnouncements: hasPermission(role, "announcement", "create"),
    canManageSettings: hasPermission(role, "setting", "update"),
    canViewSupport: true, // Everyone can access support
    canManageUsers: hasPermission(role, "user", "set-role"),
    canViewProfile: true, // Everyone can view their profile
    canViewTimetable: hasPermission(role, "timetable", "view"),
    canViewHostel: hasPermission(role, "hostel", "view"),
    canViewLibrary: hasPermission(role, "library", "view"),
    canViewInventory: hasPermission(role, "inventory", "view"),
    canViewTransport: hasPermission(role, "transport", "view"),
    canViewCommunications: hasPermission(role, "communication", "view"),
  };
}

/**
 * Get role-based dashboard path
 */
export function getRoleDashboardPath(role: string, schoolSlug: string): string {
  const normalizedRole = normalizeRole(role);
  const safeSlug = schoolSlug.replace(/^\/+/, "");

  const dashboardMap: Record<BetterAuthRole, string> = {
    superAdmin: `/admin/dashboard`,
    owner: `/admin/dashboard`,
    admin: `/admin/dashboard`,
    member: `/admin/dashboard`,
    teacher: `/teacher/dashboard`,
    student: `/student/dashboard`,
    guardian: `/parent/dashboard`,
    staff: `/admin/dashboard`,
    accountant: `/accountant/dashboard`,
    user: `/admin/dashboard`,
  };

  return `/${safeSlug}${dashboardMap[normalizedRole]}`;
}
