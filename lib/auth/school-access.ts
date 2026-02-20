// lib/auth/school-access.ts - REFACTORED for Better Auth
import type {
  ExtendedSession,
  SchoolAccess,
  EffectiveRole,
  ProfileRoleType,
  OrganizationRole,
  MembershipWithOrganization,
} from "./types";
import { StudentStatus, StaffType } from "@/lib/generated/prisma/client";
import { ROLE_PRIORITY } from "./types";

/**
 * Get all school access for a user
 * Handles multi-role scenarios (e.g., teacher + guardian + admin in same school)
 */
export function getUserSchoolAccess(session: ExtendedSession): SchoolAccess[] {
  const schoolAccessMap = new Map<string, SchoolAccess>();

  // Step 1: Process organization memberships first (OWNER, ADMIN, MEMBER)
  session.memberships.forEach((membership: MembershipWithOrganization) => {
    if (membership.organization.school) {
      const school = membership.organization.school;

      schoolAccessMap.set(school.id, {
        schoolId: school.id,
        schoolName: school.name,
        subdomain: school.subdomain,
        organizationId: membership.organizationId,
        organizationRole: membership.role as OrganizationRole,
        profileRoles: [], // Will be populated below
        effectiveRole: mapOrgRoleToEffective(
          membership.role as OrganizationRole,
        ),
        isActive: true,
      });
    }
  });

  // Step 2: Add profile-based roles
  if (session.profile) {
    const { teacher, student, staff, guardian } = session.profile;

    // Teacher role
    if (teacher && teacher.isActive && teacher.school) {
      const existing = schoolAccessMap.get(teacher.school.id);
      if (existing) {
        existing.profileRoles.push("teacher");
        existing.effectiveRole = getHighestRole(
          existing.effectiveRole,
          "teacher",
        );
      } else {
        schoolAccessMap.set(teacher.school.id, {
          schoolId: teacher.school.id,
          schoolName: teacher.school.name,
          subdomain: teacher.school.subdomain,
          organizationId: teacher.school.organizationId,
          organizationRole: undefined,
          profileRoles: ["teacher"],
          effectiveRole: "teacher",
          isActive: teacher.isActive,
        });
      }
    }

    // Student role
    if (student && student.status === StudentStatus.ACTIVE && student.school) {
      const existing = schoolAccessMap.get(student.school.id);
      if (existing) {
        existing.profileRoles.push("student");
        existing.effectiveRole = getHighestRole(
          existing.effectiveRole,
          "student",
        );
      } else {
        schoolAccessMap.set(student.school.id, {
          schoolId: student.school.id,
          schoolName: student.school.name,
          subdomain: student.school.subdomain,
          organizationId: student.school.organizationId,
          organizationRole: undefined,
          profileRoles: ["student"],
          effectiveRole: "student",
          isActive: true,
        });
      }
    }

    // Staff role (including accountant)
    if (staff && staff.isActive && staff.school) {
      const existing = schoolAccessMap.get(staff.school.id);
      const staffRole =
        staff.staffType === StaffType.ACCOUNTANT ? "accountant" : "staff";

      if (existing) {
        existing.profileRoles.push(staffRole);
        existing.effectiveRole = getHighestRole(
          existing.effectiveRole,
          staffRole,
        );
      } else {
        schoolAccessMap.set(staff.school.id, {
          schoolId: staff.school.id,
          schoolName: staff.school.name,
          subdomain: staff.school.subdomain,
          organizationId: staff.school.organizationId,
          organizationRole: undefined,
          profileRoles: [staffRole],
          effectiveRole: staffRole,
          isActive: staff.isActive,
        });
      }
    }

    // Guardian role (includes parents, legal guardians, and other caretakers)
    if (guardian && guardian.isActive && guardian.canLogin && guardian.school) {
      const existing = schoolAccessMap.get(guardian.school.id);
      if (existing) {
        existing.profileRoles.push("guardian");
        existing.effectiveRole = getHighestRole(
          existing.effectiveRole,
          "guardian",
        );
      } else {
        schoolAccessMap.set(guardian.school.id, {
          schoolId: guardian.school.id,
          schoolName: guardian.school.name,
          subdomain: guardian.school.subdomain,
          organizationId: guardian.school.organizationId,
          organizationRole: undefined,
          profileRoles: ["guardian"],
          effectiveRole: "guardian",
          isActive: guardian.isActive,
        });
      }
    }
  }

  return Array.from(schoolAccessMap.values());
}

/**
 * Map Better Auth organization role to effective role
 */
function mapOrgRoleToEffective(orgRole: OrganizationRole): EffectiveRole {
  switch (orgRole) {
    case "owner":
      return "owner";
    case "admin":
      return "admin";
    case "member":
      return "member";
    default:
      return "member";
  }
}

/**
 * Get the highest priority role
 */
function getHighestRole(
  current: EffectiveRole,
  candidate: ProfileRoleType | EffectiveRole,
): EffectiveRole {
  const currentPriority = ROLE_PRIORITY[current];
  const candidatePriority =
    ROLE_PRIORITY[candidate as keyof typeof ROLE_PRIORITY];
  return currentPriority > candidatePriority
    ? current
    : (candidate as EffectiveRole);
}

/**
 * Check if user has access to a specific school
 */
export function hasSchoolAccess(
  session: ExtendedSession,
  subdomain: string,
): boolean {
  if (session.isSuperAdmin) return true;

  const access = getUserSchoolAccess(session);
  return access.some((a) => a.subdomain === subdomain && a.isActive);
}

export function getSchoolRole(
  session: ExtendedSession,
  subdomain: string,
): SchoolAccess | null {
  console.log(`[School Access] 🔍 Checking access for: ${subdomain}`);
  console.log(`[School Access] User: ${session.user.email}`);
  console.log(`[School Access] Is Super Admin: ${session.isSuperAdmin}`);

  if (session.isSuperAdmin) {
    console.log("[School Access] ✅ Super Admin - granting implicit access");
    return {
      schoolId: "system",
      schoolName: "System",
      subdomain,
      organizationId: "system",
      organizationRole: undefined,
      profileRoles: [],
      effectiveRole: "owner",
      isActive: true,
    };
  }

  const access = getUserSchoolAccess(session);
  console.log(
    `[School Access] 📋 User has access to ${access.length} schools:`,
  );

  access.forEach((a, index) => {
    console.log(
      `[School Access]   ${index + 1}. ${a.schoolName} (${a.subdomain})`,
    );
    console.log(`[School Access]      Role: ${a.effectiveRole}`);
    console.log(
      `[School Access]      Org Role: ${a.organizationRole || "none"}`,
    );
    console.log(
      `[School Access]      Profile Roles: ${a.profileRoles.join(", ") || "none"}`,
    );
    console.log(`[School Access]      Active: ${a.isActive}`);
  });

  const result = access.find((a) => a.subdomain === subdomain) || null;

  if (result) {
    console.log(`[School Access] ✅ Access granted to ${subdomain}`);
    console.log(`[School Access]    Effective Role: ${result.effectiveRole}`);
  } else {
    console.log(`[School Access] ❌ No access to ${subdomain}`);
    console.log(
      `[School Access]    Available subdomains: ${access.map((a) => a.subdomain).join(", ") || "none"}`,
    );
  }

  return result;
}

/**
 * Get primary school for user (used for default routing)
 * Priority: highest role > first school
 */
export function getPrimarySchool(
  session: ExtendedSession,
): SchoolAccess | null {
  const access = getUserSchoolAccess(session);

  if (access.length === 0) return null;

  // Find the school with the highest role
  let primary = access[0];
  let highestPriority = ROLE_PRIORITY[primary.effectiveRole];

  for (const school of access) {
    const priority = ROLE_PRIORITY[school.effectiveRole];
    if (priority > highestPriority && school.isActive) {
      primary = school;
      highestPriority = priority;
    }
  }

  return primary;
}

/**
 * Check if user has a specific role in a school
 * Can check for organization role OR profile role
 */
export function hasRoleInSchool(
  session: ExtendedSession,
  subdomain: string,
  role: EffectiveRole | ProfileRoleType,
): boolean {
  if (session.isSuperAdmin) return true;

  const access = getSchoolRole(session, subdomain);
  if (!access) return false;

  // Check organization role
  if (role === "owner" && access.organizationRole === "owner") return true;
  if (
    role === "admin" &&
    (access.organizationRole === "owner" || access.organizationRole === "admin")
  )
    return true;
  if (role === "member" && access.organizationRole === "member") return true;

  // Check profile roles
  return access.profileRoles.includes(role as ProfileRoleType);
}

/**
 * Get all roles a user has in a specific school
 */
export function getAllRolesInSchool(
  session: ExtendedSession,
  subdomain: string,
): string[] {
  if (session.isSuperAdmin) return ["superAdmin"];

  const access = getSchoolRole(session, subdomain);
  if (!access) return [];

  const roles: string[] = [];

  // Add organization role
  if (access.organizationRole) {
    roles.push(access.organizationRole.toLowerCase());
  }

  // Add profile roles
  roles.push(...access.profileRoles);

  return roles;
}

/**
 * Check if user can access multiple schools
 */
export function isMultiSchoolUser(session: ExtendedSession): boolean {
  const access = getUserSchoolAccess(session);
  return access.length > 1;
}

/**
 * Get school access by school ID
 */
export function getSchoolAccessById(
  session: ExtendedSession,
  schoolId: string,
): SchoolAccess | null {
  if (session.isSuperAdmin) {
    return {
      schoolId,
      schoolName: "System",
      subdomain: "system",
      organizationId: "system",
      organizationRole: undefined,
      profileRoles: [],
      effectiveRole: "owner",
      isActive: true,
    };
  }

  const access = getUserSchoolAccess(session);
  return access.find((a) => a.schoolId === schoolId) || null;
}
