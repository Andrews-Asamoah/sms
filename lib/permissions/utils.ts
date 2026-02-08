// @/lib/permissions/utils.ts

import type { ExtendedSession, NavPermissions } from "@/lib/auth/types";
import { getSchoolRole } from "@/lib/auth/school-access";
import { auth } from "../auth";

// ============================================================================
// MAIN PERMISSION FUNCTION
// ============================================================================

/**
 * Get navigation permissions for a user in a specific school
 *
 * Priority order:
 * 1. SuperAdmin gets all permissions
 * 2. Organization role permissions (owner, admin, member)
 * 3. Profile role permissions (teacher, student, etc.)
 * 4. Better Auth explicit permissions (if configured)
 *
 * Permissions are merged using union (most permissive wins)
 */
export async function getNavPermissions(
  session: ExtendedSession,
  subdomain: string,
): Promise<NavPermissions> {
  // SuperAdmin - all permissions
  if (session.isSuperAdmin) {
    console.log(
      `[Permissions] SuperAdmin ${session.user.email} - granting all permissions`,
    );
    return getAllPermissions();
  }

  // Get user's access to this school
  const schoolAccess = getSchoolRole(session, subdomain);

  if (!schoolAccess) {
    console.log(`[Permissions] No school access found for ${subdomain}`);
    return getNoPermissions();
  }

  console.log(
    `[Permissions] Getting permissions for ${session.user.email} in ${subdomain}`,
  );
  console.log(`[Permissions] Effective role: ${schoolAccess.effectiveRole}`);
  console.log(
    `[Permissions] Organization role: ${schoolAccess.organizationRole ?? "none"}`,
  );
  console.log(
    `[Permissions] Profile roles: ${schoolAccess.profileRoles.join(", ") || "none"}`,
  );

  // Start with permissions based on effective role
  let permissions = getPermissionsByRole(schoolAccess.effectiveRole);

  // Union permissions from all profile roles
  // This allows a teacher+guardian to have BOTH sets of permissions
  for (const profileRole of schoolAccess.profileRoles) {
    const rolePermissions = getPermissionsByRole(profileRole);
    permissions = mergePermissions(permissions, rolePermissions);
  }

  // If user has Better Auth permissions, check those too
  try {
    const hasSchoolManage = await checkBetterAuthPermission(session.user.id, {
      school: ["manage"],
    });

    if (hasSchoolManage) {
      console.log(`[Permissions] User has explicit school:manage permission`);
      const adminPerms = getPermissionsByRole("admin");
      permissions = mergePermissions(permissions, adminPerms);
    }
  } catch (error) {
    console.log(
      "[Permissions] Could not check Better Auth permissions:",
      error,
    );
    // Continue with role-based permissions
  }

  return permissions;
}

// ============================================================================
// ROLE-BASED PERMISSIONS
// ============================================================================

/**
 * Get permissions for a single role
 * Maps to Better Auth permission statements
 */
function getPermissionsByRole(role: string): NavPermissions {
  switch (role) {
    case "owner":
    case "admin":
      return {
        canViewDashboard: true,
        canViewAnalytics: true,
        canManageStudents: true,
        canManageTeachers: true,
        canManageStaff: true,
        canManageParents: true,
        canManageClasses: true,
        canManageSubjects: true,
        canManageDepartments: true,
        canManageHouses: true,
        canManageGrading: true,
        canViewReports: true,
        canManageAttendance: true,
        canManageAcademicYear: true,
        canManageFinance: role === "owner", // Only owner can manage finance fully
        canManageDocuments: true,
        canViewTimetable: true,
        canViewHostel: true,
        canViewLibrary: true,
        canViewInventory: true,
        canViewTransport: true,
        canManageAnnouncements: true,
        canViewCommunications: true,
        canViewProfile: true,
        canManageSettings: role === "owner", // Only owner can manage settings
        canViewSupport: true,
      };

    case "teacher":
      return {
        canViewDashboard: true,
        canViewAnalytics: false,
        canManageStudents: false,
        canManageTeachers: false,
        canManageStaff: false,
        canManageParents: false,
        canManageClasses: false,
        canManageSubjects: false,
        canManageDepartments: false,
        canManageHouses: false,
        canManageGrading: true, // Can grade students
        canViewReports: true,
        canManageAttendance: true, // Can mark attendance
        canManageAcademicYear: false,
        canManageFinance: false,
        canManageDocuments: true,
        canViewTimetable: true,
        canViewHostel: false,
        canViewLibrary: true,
        canViewInventory: false,
        canViewTransport: false,
        canManageAnnouncements: false,
        canViewCommunications: true,
        canViewProfile: true,
        canManageSettings: false,
        canViewSupport: true,
      };

    case "accountant":
      return {
        canViewDashboard: true,
        canViewAnalytics: true,
        canManageStudents: false,
        canManageTeachers: false,
        canManageStaff: false,
        canManageParents: false,
        canManageClasses: false,
        canManageSubjects: false,
        canManageDepartments: false,
        canManageHouses: false,
        canManageGrading: false,
        canViewReports: true,
        canManageAttendance: false,
        canManageAcademicYear: false,
        canManageFinance: true, // Full finance access
        canManageDocuments: true,
        canViewTimetable: false,
        canViewHostel: false,
        canViewLibrary: false,
        canViewInventory: false,
        canViewTransport: false,
        canManageAnnouncements: false,
        canViewCommunications: false,
        canViewProfile: true,
        canManageSettings: false,
        canViewSupport: true,
      };

    case "staff":
      return {
        canViewDashboard: true,
        canViewAnalytics: false,
        canManageStudents: false,
        canManageTeachers: false,
        canManageStaff: false,
        canManageParents: false,
        canManageClasses: false,
        canManageSubjects: false,
        canManageDepartments: false,
        canManageHouses: false,
        canManageGrading: false,
        canViewReports: false,
        canManageAttendance: false,
        canManageAcademicYear: false,
        canManageFinance: false,
        canManageDocuments: true,
        canViewTimetable: false,
        canViewHostel: true,
        canViewLibrary: true,
        canViewInventory: true,
        canViewTransport: true,
        canManageAnnouncements: false,
        canViewCommunications: true,
        canViewProfile: true,
        canManageSettings: false,
        canViewSupport: true,
      };

    case "student":
      return {
        canViewDashboard: true,
        canViewAnalytics: false,
        canManageStudents: false,
        canManageTeachers: false,
        canManageStaff: false,
        canManageParents: false,
        canManageClasses: false,
        canManageSubjects: false,
        canManageDepartments: false,
        canManageHouses: false,
        canManageGrading: false,
        canViewReports: true,
        canManageAttendance: false,
        canManageAcademicYear: false,
        canManageFinance: false,
        canManageDocuments: false,
        canViewTimetable: true,
        canViewHostel: true,
        canViewLibrary: true,
        canViewInventory: false,
        canViewTransport: true,
        canManageAnnouncements: false,
        canViewCommunications: true,
        canViewProfile: true,
        canManageSettings: false,
        canViewSupport: true,
      };

    case "guardian":
      return {
        canViewDashboard: true,
        canViewAnalytics: false,
        canManageStudents: false,
        canManageTeachers: false,
        canManageStaff: false,
        canManageParents: false,
        canManageClasses: false,
        canManageSubjects: false,
        canManageDepartments: false,
        canManageHouses: false,
        canManageGrading: false,
        canViewReports: true,
        canManageAttendance: false,
        canManageAcademicYear: false,
        canManageFinance: true, // Can pay fees
        canManageDocuments: false,
        canViewTimetable: true,
        canViewHostel: false,
        canViewLibrary: false,
        canViewInventory: false,
        canViewTransport: true,
        canManageAnnouncements: false,
        canViewCommunications: true,
        canViewProfile: true,
        canManageSettings: false,
        canViewSupport: true,
      };

    case "member":
      // Basic member with no specific profile
      return {
        canViewDashboard: true,
        canViewAnalytics: false,
        canManageStudents: false,
        canManageTeachers: false,
        canManageStaff: false,
        canManageParents: false,
        canManageClasses: false,
        canManageSubjects: false,
        canManageDepartments: false,
        canManageHouses: false,
        canManageGrading: false,
        canViewReports: false,
        canManageAttendance: false,
        canManageAcademicYear: false,
        canManageFinance: false,
        canManageDocuments: true,
        canViewTimetable: true,
        canViewHostel: false,
        canViewLibrary: true,
        canViewInventory: false,
        canViewTransport: false,
        canManageAnnouncements: false,
        canViewCommunications: true,
        canViewProfile: true,
        canManageSettings: false,
        canViewSupport: true,
      };

    default:
      console.warn(`[Permissions] Unknown role: ${role}`);
      return getNoPermissions();
  }
}

// ============================================================================
// PERMISSION MERGING
// ============================================================================

/**
 * Merge two permission sets (union - most permissive wins)
 */
function mergePermissions(
  p1: NavPermissions,
  p2: NavPermissions,
): NavPermissions {
  return {
    canViewDashboard: p1.canViewDashboard || p2.canViewDashboard,
    canViewAnalytics: p1.canViewAnalytics || p2.canViewAnalytics,
    canManageStudents: p1.canManageStudents || p2.canManageStudents,
    canManageTeachers: p1.canManageTeachers || p2.canManageTeachers,
    canManageStaff: p1.canManageStaff || p2.canManageStaff,
    canManageParents: p1.canManageParents || p2.canManageParents,
    canManageClasses: p1.canManageClasses || p2.canManageClasses,
    canManageSubjects: p1.canManageSubjects || p2.canManageSubjects,
    canManageDepartments: p1.canManageDepartments || p2.canManageDepartments,
    canManageHouses: p1.canManageHouses || p2.canManageHouses,
    canManageGrading: p1.canManageGrading || p2.canManageGrading,
    canViewReports: p1.canViewReports || p2.canViewReports,
    canManageAttendance: p1.canManageAttendance || p2.canManageAttendance,
    canManageAcademicYear: p1.canManageAcademicYear || p2.canManageAcademicYear,
    canManageFinance: p1.canManageFinance || p2.canManageFinance,
    canManageDocuments: p1.canManageDocuments || p2.canManageDocuments,
    canViewTimetable: p1.canViewTimetable || p2.canViewTimetable,
    canViewHostel: p1.canViewHostel || p2.canViewHostel,
    canViewLibrary: p1.canViewLibrary || p2.canViewLibrary,
    canViewInventory: p1.canViewInventory || p2.canViewInventory,
    canViewTransport: p1.canViewTransport || p2.canViewTransport,
    canManageAnnouncements:
      p1.canManageAnnouncements || p2.canManageAnnouncements,
    canViewCommunications: p1.canViewCommunications || p2.canViewCommunications,
    canViewProfile: p1.canViewProfile || p2.canViewProfile,
    canManageSettings: p1.canManageSettings || p2.canManageSettings,
    canViewSupport: p1.canViewSupport || p2.canViewSupport,
  };
}

// ============================================================================
// PERMISSION PRESETS
// ============================================================================

/**
 * All permissions granted
 */
function getAllPermissions(): NavPermissions {
  return {
    canViewDashboard: true,
    canViewAnalytics: true,
    canManageStudents: true,
    canManageTeachers: true,
    canManageStaff: true,
    canManageParents: true,
    canManageClasses: true,
    canManageSubjects: true,
    canManageDepartments: true,
    canManageHouses: true,
    canManageGrading: true,
    canViewReports: true,
    canManageAttendance: true,
    canManageAcademicYear: true,
    canManageFinance: true,
    canManageDocuments: true,
    canViewTimetable: true,
    canViewHostel: true,
    canViewLibrary: true,
    canViewInventory: true,
    canViewTransport: true,
    canManageAnnouncements: true,
    canViewCommunications: true,
    canViewProfile: true,
    canManageSettings: true,
    canViewSupport: true,
  };
}

/**
 * No permissions granted (except profile view and support)
 */
function getNoPermissions(): NavPermissions {
  return {
    canViewDashboard: false,
    canViewAnalytics: false,
    canManageStudents: false,
    canManageTeachers: false,
    canManageStaff: false,
    canManageParents: false,
    canManageClasses: false,
    canManageSubjects: false,
    canManageDepartments: false,
    canManageHouses: false,
    canManageGrading: false,
    canViewReports: false,
    canManageAttendance: false,
    canManageAcademicYear: false,
    canManageFinance: false,
    canManageDocuments: false,
    canViewTimetable: false,
    canViewHostel: false,
    canViewLibrary: false,
    canViewInventory: false,
    canViewTransport: false,
    canManageAnnouncements: false,
    canViewCommunications: false,
    canViewProfile: true, // Always allow profile view
    canManageSettings: false,
    canViewSupport: true, // Always allow support
  };
}

// ============================================================================
// BETTER AUTH PERMISSION HELPERS
// ============================================================================

/**
 * Check Better Auth permission
 */
export async function checkBetterAuthPermission(
  userId: string,
  permissions: Record<string, string[]>,
): Promise<boolean> {
  try {
    const result = await auth.api.userHasPermission({
      body: {
        userId,
        permissions,
      },
    });
    return !!result;
  } catch (error) {
    console.error("[Permissions] Permission check error:", error);
    return false;
  }
}

/**
 * Batch permission check
 */
export async function checkMultiplePermissions(
  userId: string,
  permissionsList: Array<Record<string, string[]>>,
): Promise<boolean[]> {
  const results = await Promise.all(
    permissionsList.map((permissions) =>
      checkBetterAuthPermission(userId, permissions),
    ),
  );
  return results;
}
