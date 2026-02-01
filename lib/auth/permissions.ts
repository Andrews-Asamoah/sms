// lib/auth/permissions.ts - REFACTORED with standardized lowercase roles
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

// ============================================================================
// PERMISSION STATEMENTS
// ============================================================================

/**
 * Define all possible permissions for your School Management System
 * Use `as const` for proper TypeScript inference
 *
 * Format: resource: [action1, action2, ...]
 */
export const statement = {
  ...defaultStatements, // Include default user/session permissions from Better Auth

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

// Create the access controller
export const ac = createAccessControl(statement);

// ============================================================================
// ROLE DEFINITIONS (lowercase - Better Auth convention)
// ============================================================================

/**
 * SUPER_ADMIN: Platform-level administrator
 * - Can create and manage all schools
 * - Full access to all features
 * - Can impersonate any user
 * - System-wide analytics and settings
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

/**
 * OWNER: Organization owner (School Principal/Proprietor)
 * - Full access within their school
 * - Can manage all users and settings
 * - Financial approval authority
 * - Cannot create new schools
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

/**
 * ADMIN: School-level administrator (Vice Principal/Administrator)
 * - Manages day-to-day operations
 * - Can manage students, teachers, and staff
 * - Limited financial access (view only)
 * - Cannot change critical settings
 */
export const admin = ac.newRole({
  user: ["list", "ban", "set-role"],
  session: ["list", "revoke"],
  school: ["view", "update"],
  student: ["create", "update", "delete", "view", "enroll"],
  teacher: ["create", "update", "delete", "view", "assign"],
  staff: ["create", "update", "delete", "view"],
  parent: ["create", "update", "delete", "view"],
  class: ["create", "update", "delete", "view", "manage"],
  subject: ["create", "update", "delete", "view"],
  department: ["create", "update", "delete", "view"],
  house: ["create", "update", "delete", "view"],
  finance: ["view"], // View only
  bill: ["view"],
  payment: ["view"],
  assessment: ["create", "update", "delete", "view", "grade"],
  attendance: ["create", "update", "delete", "view", "approve"],
  report: ["create", "view", "download", "approve"],
  document: ["create", "update", "delete", "view", "upload"],
  announcement: ["create", "update", "delete", "view"],
  setting: ["view"], // View only
  analytics: ["view"],
  timetable: ["create", "update", "delete", "view"],
  hostel: ["create", "update", "delete", "view"],
  library: ["create", "update", "delete", "view"],
  inventory: ["create", "update", "delete", "view"],
  transport: ["create", "update", "delete", "view"],
  communication: ["view", "send"],
});

/**
 * TEACHER: Classroom teacher
 * - Manages their classes and students
 * - Records grades and attendance
 * - Views financial information for their students
 * - Limited administrative access
 */
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

/**
 * ACCOUNTANT: Financial administrator
 * - Manages all financial operations
 * - Creates and manages bills
 * - Records payments
 * - Generates financial reports
 * - View-only access to students
 */
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

/**
 * STAFF: General staff member (Librarian, Nurse, etc.)
 * - Limited access based on department
 * - Can upload documents
 * - View-only access to most features
 */
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

/**
 * STUDENT: Student account
 * - View their own information
 * - View grades, attendance, and reports
 * - View financial information (bills/payments)
 * - Access learning resources
 */
export const student = ac.newRole({
  school: ["view"],
  student: ["view"], // Only their own data
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

/**
 * GUARDIAN/PARENT: Parent or guardian account
 * - View their children's information
 * - View grades, attendance, and reports
 * - Make payments
 * - Communicate with teachers
 */
export const guardian = ac.newRole({
  school: ["view"],
  student: ["view"], // Only their children
  class: ["view"],
  subject: ["view"],
  assessment: ["view"],
  attendance: ["view"],
  report: ["view"],
  finance: ["view", "create"], // Can make payments
  bill: ["view"],
  payment: ["view", "create"], // Can make payments
  timetable: ["view"],
  transport: ["view"],
  communication: ["view", "send"],
  announcement: ["view"],
  document: ["view"],
});

/**
 * USER: Default role with minimal permissions
 * - Basic authenticated user
 * - No specific school access
 * - Can view own profile
 */
export const user = ac.newRole({
  user: ["list"],
  school: ["view"],
});

// ============================================================================
// ROLE HIERARCHY (For reference)
// ============================================================================

/**
 * Role Hierarchy (highest to lowest):
 *
 * 1. superAdmin - Platform administrator
 * 2. owner - School owner/principal
 * 3. admin - School administrator
 * 4. accountant - Financial manager
 * 5. teacher - Classroom teacher
 * 6. staff - General staff
 * 7. guardian - Parent/guardian
 * 8. student - Student
 * 9. user - Basic user
 */

// ============================================================================
// PERMISSION UTILITIES
// ============================================================================

/**
 * Get all available roles
 */
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

/**
 * Type for role names
 */
export type RoleName = (typeof ROLES)[number];

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
 * Get role display name
 */
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

/**
 * Get role description
 */
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
