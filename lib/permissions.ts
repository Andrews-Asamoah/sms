// ============================================================
// 1. UPDATED PERMISSIONS WITH BETTER AUTH
// lib/permissions.ts
// ============================================================

import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

/**
 * Define custom permissions for your SMS
 * Use `as const` for proper TypeScript inference
 */
export const statement = {
  ...defaultStatements, // Include default user/session permissions
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
} as const;

// Create the access controller
export const ac = createAccessControl(statement);

/**
 * SUPER_ADMIN: Full system access, can create schools and manage everything
 */
export const superAdmin = ac.newRole({
  ...adminAc.statements, // All default admin permissions
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
});

/**
 * OWNER: Organization owner, full access within their school
 */
export const owner = ac.newRole({
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
});

/**
 * ADMIN: School-level admin, manages their school
 */
export const admin = ac.newRole({
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
  finance: ["view"], // Can view but not manage
  assessment: ["create", "update", "delete", "view", "grade"],
  attendance: ["create", "update", "delete", "view", "approve"],
  report: ["create", "view", "download", "approve"],
  document: ["create", "update", "delete", "view", "upload"],
  announcement: ["create", "update", "delete", "view"],
  setting: ["view"], // Can view but not update
  analytics: ["view"],
  timetable: ["create", "update", "delete", "view"],
  hostel: ["create", "update", "delete", "view"],
  library: ["create", "update", "delete", "view"],
  inventory: ["create", "update", "delete", "view"],
  transport: ["create", "update", "delete", "view"],
  communication: ["view", "send"],
});

/**
 * MEMBER: Basic organization member
 */
export const member = ac.newRole({
  school: ["view"],
  student: ["view"],
  teacher: ["view"],
  class: ["view"],
  report: ["view"],
  document: ["view", "upload"],
  timetable: ["view"],
  library: ["view"],
  communication: ["view"],
});

/**
 * TEACHER: Can manage students, grades, and attendance
 */
export const teacher = ac.newRole({
  student: ["view", "enroll"],
  teacher: ["view"],
  class: ["view"],
  assessment: ["create", "update", "view", "grade"],
  attendance: ["create", "update", "view"],
  report: ["create", "view"],
  document: ["view", "upload"],
  finance: ["view"],
  timetable: ["view"],
  library: ["view"],
  communication: ["view", "send"],
});

/**
 * ACCOUNTANT: Manages financial operations
 */
export const accountant = ac.newRole({
  student: ["view"],
  finance: ["create", "update", "view", "approve"],
  report: ["create", "view", "download"],
  document: ["view", "upload"],
  analytics: ["view"],
});

/**
 * STAFF: General staff member
 */
export const staff = ac.newRole({
  document: ["view", "upload"],
  hostel: ["view"],
  library: ["view"],
  inventory: ["view"],
  transport: ["view"],
  communication: ["view"],
});

/**
 * STUDENT: Limited read access
 */
export const student = ac.newRole({
  student: ["view"],
  assessment: ["view"],
  attendance: ["view"],
  report: ["view"],
  finance: ["view"],
  timetable: ["view"],
  hostel: ["view"],
  library: ["view"],
  transport: ["view"],
  communication: ["view"],
});

/**
 * GUARDIAN/PARENT: Can view their children's information
 */
export const guardian = ac.newRole({
  student: ["view"],
  assessment: ["view"],
  attendance: ["view"],
  report: ["view"],
  finance: ["view", "create"], // Can view and pay bills
  timetable: ["view"],
  transport: ["view"],
  communication: ["view"],
});

/**
 * USER: Default role with minimal permissions
 */
export const user = ac.newRole({
  user: ["list"],
});
