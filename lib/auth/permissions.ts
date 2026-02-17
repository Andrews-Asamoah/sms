// lib/auth/permissions.ts - FIXED with organization permissions

import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

// ============================================================================
// PERMISSION STATEMENTS
// ============================================================================

export const statement = {
  ...defaultStatements,

  // 🔥 CRITICAL: Organization management (for Better Auth organization plugin)
  organization: [
    "create",
    "update",
    "delete",
    "view",
    "invite",
    "remove-member",
  ],

  // Core entities
  school: ["create", "update", "delete", "view", "manage"],
  student: ["create", "update", "delete", "view", "enroll"],
  teacher: ["create", "update", "delete", "view", "assign"],
  staff: ["create", "update", "delete", "view"],
  parent: ["create", "update", "delete", "view"],

  // Academic
  class: ["create", "update", "delete", "view", "manage"],
  subject: ["create", "update", "delete", "view"],
  department: ["create", "update", "delete", "view"],
  house: ["create", "update", "delete", "view"],
  assessment: ["create", "update", "delete", "view", "grade"],
  attendance: ["create", "update", "delete", "view", "approve"],
  timetable: ["create", "update", "delete", "view"],

  // Financial
  finance: ["create", "update", "delete", "view", "approve"],
  bill: ["create", "update", "delete", "view"],
  payment: ["create", "update", "delete", "view"],

  // Reporting
  report: ["create", "view", "download", "approve"],
  analytics: ["view"],

  // Administrative
  document: ["create", "update", "delete", "view", "upload"],
  announcement: ["create", "update", "delete", "view"],
  setting: ["view", "update"],
  communication: ["view", "send"],

  // Facilities
  hostel: ["create", "update", "delete", "view"],
  library: ["create", "update", "delete", "view"],
  inventory: ["create", "update", "delete", "view"],
  transport: ["create", "update", "delete", "view"],
} as const;

export const ac = createAccessControl(statement);

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export const superAdmin = ac.newRole({
  ...adminAc.statements,

  // Organization permissions
  organization: [
    "create",
    "update",
    "delete",
    "view",
    "invite",
    "remove-member",
  ],

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
  bill: ["create", "update", "delete", "view"],
  payment: ["create", "update", "delete", "view"],
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
});

export const owner = ac.newRole({
  user: ["list", "ban", "set-role"],
  session: ["list", "revoke"],

  // Organization permissions (owners can invite)
  organization: ["update", "view", "invite", "remove-member"],

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
  bill: ["create", "update", "delete", "view"],
  payment: ["create", "update", "delete", "view"],
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
});

export const admin = ac.newRole({
  user: ["list", "ban", "set-role"],
  session: ["list", "revoke"],

  // Organization permissions (admins can invite)
  organization: ["view", "invite"],

  school: ["view", "update"],
  student: ["create", "update", "delete", "view", "enroll"],
  teacher: ["create", "update", "delete", "view", "assign"],
  staff: ["create", "update", "delete", "view"],
  parent: ["create", "update", "delete", "view"],
  class: ["create", "update", "delete", "view", "manage"],
  subject: ["create", "update", "delete", "view"],
  department: ["create", "update", "delete", "view"],
  house: ["create", "update", "delete", "view"],
  finance: ["view"],
  bill: ["view"],
  payment: ["view"],
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
});

export const teacher = ac.newRole({
  school: ["view"],
  student: ["view"],
  teacher: ["view"],
  class: ["view"],
  subject: ["view"],
  department: ["view"],
  assessment: ["create", "update", "view", "grade"],
  attendance: ["create", "update", "view"],
  report: ["create", "view"],
  document: ["view", "upload"],
  finance: ["view"],
  bill: ["view"],
  payment: ["view"],
  timetable: ["view"],
  library: ["view"],
  communication: ["view", "send"],
  announcement: ["view"],
});

export const accountant = ac.newRole({
  school: ["view"],
  student: ["view"],
  finance: ["create", "update", "view", "approve"],
  bill: ["create", "update", "view"],
  payment: ["create", "update", "view"],
  report: ["create", "view", "download"],
  document: ["view", "upload"],
  analytics: ["view"],
  communication: ["view"],
});

export const staff = ac.newRole({
  school: ["view"],
  student: ["view"],
  document: ["view", "upload"],
  hostel: ["view"],
  library: ["view"],
  inventory: ["view"],
  transport: ["view"],
  communication: ["view"],
  announcement: ["view"],
});

export const student = ac.newRole({
  school: ["view"],
  student: ["view"],
  class: ["view"],
  subject: ["view"],
  assessment: ["view"],
  attendance: ["view"],
  report: ["view"],
  finance: ["view"],
  bill: ["view"],
  payment: ["view"],
  timetable: ["view"],
  hostel: ["view"],
  library: ["view"],
  transport: ["view"],
  communication: ["view"],
  announcement: ["view"],
  document: ["view"],
});

export const guardian = ac.newRole({
  school: ["view"],
  student: ["view"],
  class: ["view"],
  subject: ["view"],
  assessment: ["view"],
  attendance: ["view"],
  report: ["view"],
  finance: ["view", "create"],
  bill: ["view"],
  payment: ["view", "create"],
  timetable: ["view"],
  transport: ["view"],
  communication: ["view", "send"],
  announcement: ["view"],
  document: ["view"],
});

export const user = ac.newRole({
  user: ["list"],
  school: ["view"],
});

// ============================================================================
// UTILITIES (Keep your existing utilities)
// ============================================================================

export const ROLES = [
  "superAdmin",
  "owner",
  "admin",
  "teacher",
  "accountant",
  "student",
  "guardian",
  "staff",
  "user",
] as const;

export type RoleName = (typeof ROLES)[number];

export function hasHigherOrEqualRole(
  userRole: RoleName,
  requiredRole: RoleName,
): boolean {
  const roleIndex = ROLES.indexOf(userRole);
  const requiredIndex = ROLES.indexOf(requiredRole);
  return roleIndex <= requiredIndex;
}

export function getRoleDisplayName(role: RoleName): string {
  const displayNames: Record<RoleName, string> = {
    superAdmin: "Super Administrator",
    owner: "School Owner",
    admin: "Administrator",
    teacher: "Teacher",
    accountant: "Accountant",
    student: "Student",
    guardian: "Parent/Guardian",
    staff: "Staff",
    user: "User",
  };
  return displayNames[role];
}

export function getRoleDescription(role: RoleName): string {
  const descriptions: Record<RoleName, string> = {
    superAdmin: "Full platform access and school creation",
    owner: "Full access to their school",
    admin: "Day-to-day school operations management",
    teacher: "Classroom management and student assessment",
    accountant: "Financial management and reporting",
    student: "View own academic information",
    guardian: "View children's information and make payments",
    staff: "Department-specific access",
    user: "Basic authenticated user",
  };
  return descriptions[role];
}
