// lib/permissions.ts
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
  finance: ["create", "update", "delete", "view", "approve"],
  assessment: ["create", "update", "delete", "view", "grade"],
  report: ["create", "view", "download", "approve"],
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
  finance: ["create", "update", "delete", "view", "approve"],
  assessment: ["create", "update", "delete", "view", "grade"],
  report: ["create", "view", "download", "approve"],
});

/**
 * ADMIN: School-level admin, manages their school
 */
export const admin = ac.newRole({
  user: ["list", "ban", "set-role"], // Can manage users in their school
  session: ["list", "revoke"],
  school: ["update", "view", "manage"], // Can't create new schools
  student: ["create", "update", "delete", "view", "enroll"],
  teacher: ["create", "update", "delete", "view", "assign"],
  finance: ["create", "update", "delete", "view", "approve"],
  assessment: ["create", "update", "delete", "view", "grade"],
  report: ["create", "view", "download", "approve"],
});

/**
 * TEACHER: Can manage students, grades, and attendance
 */
export const teacher = ac.newRole({
  student: ["view", "enroll"],
  teacher: ["view"],
  assessment: ["create", "update", "view", "grade"],
  report: ["create", "view"],
  finance: ["view"], // Can only view finance info
});

/**
 * ACCOUNTANT: Manages financial operations
 */
export const accountant = ac.newRole({
  student: ["view"],
  finance: ["create", "update", "view", "approve"],
  report: ["create", "view", "download"],
});

/**
 * STUDENT: Limited read access
 */
export const student = ac.newRole({
  student: ["view"], // Can view own profile
  assessment: ["view"], // Can view own grades
  report: ["view"], // Can view own reports
  finance: ["view"], // Can view own bills
});

/**
 * GUARDIAN: Can view their children's information
 */
export const guardian = ac.newRole({
  student: ["view"], // Can view their children
  assessment: ["view"], // Can view their children's grades
  report: ["view"], // Can view their children's reports
  finance: ["view", "create"], // Can view and pay bills
});

/**
 * USER: Default role with minimal permissions
 */
export const user = ac.newRole({
  user: ["list"], // Can view their own profile
});
