// lib/auth/school-access.ts - REFACTORED for Better Auth
import type {
  ExtendedSession,
  SchoolAccess,
  EffectiveRole,
  ProfileRoleType,
  OrganizationRole,
  MembershipWithOrganization,
} from "./types";
import { StudentStatus, StaffType } from "@prisma/client";
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

      // Better Auth stores comma-separated roles (e.g. "admin,teacher,guardian").
      // Split and find the highest-priority one to use as the effective role.
      const orgRoles = membership.role
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean) as OrganizationRole[];

      // Pick the highest-priority org role
      let bestEffective: EffectiveRole = "member";
      for (const r of orgRoles) {
        const mapped = mapOrgRoleToEffective(r);
        bestEffective = getHighestRole(bestEffective, mapped);
      }

      schoolAccessMap.set(school.id, {
        schoolId: school.id,
        schoolName: school.name,
        subdomain: school.subdomain,
        organizationId: membership.organizationId,
        organizationRole: orgRoles[0] ?? (membership.role as OrganizationRole),
        profileRoles: [], // Will be populated below
        effectiveRole: bestEffective,
        isActive: true,
      });
    }
  });

  // Step 2: Add profile-based roles
  if (session.profile) {
    const { teacher, student, staff, guardians } = session.profile;

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
        staff.staffType === StaffType.ACCOUNTANT ? "accountant" : "member";

      if (existing) {
        if (staffRole !== "member") {
          existing.profileRoles.push(staffRole as any);
          existing.effectiveRole = getHighestRole(
            existing.effectiveRole,
            staffRole as any,
          );
        }
      } else {
        schoolAccessMap.set(staff.school.id, {
          schoolId: staff.school.id,
          schoolName: staff.school.name,
          subdomain: staff.school.subdomain,
          organizationId: staff.school.organizationId,
          organizationRole: undefined,
          profileRoles: staffRole !== "member" ? [staffRole as any] : [],
          effectiveRole: staffRole as any,
          isActive: staff.isActive,
        });
      }
    }

    // Guardian roles — a profile may have guardian records at MULTIPLE schools
    // (multi-school parents). Iterate all and add each school's access entry.
    if (guardians && guardians.length > 0) {
      for (const guardian of guardians) {
        if (guardian.isActive && guardian.canLogin && guardian.school) {
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
    }
  }

  return Array.from(schoolAccessMap.values());
}

/**
 * Map Better Auth organization role to effective role.
 * Handles both the built-in roles (owner, admin, member) and
 * our custom roles (teacher, accountant, etc.) stored in Member.role.
 */
function mapOrgRoleToEffective(orgRole: OrganizationRole): EffectiveRole {
  switch (orgRole) {
    case "owner":
      return "owner";
    case "admin":
      return "admin";
    case "headteacher":
      return "headteacher";
    case "teacher":
      return "teacher";
    case "accountant":
      return "accountant";
    case "guardian":
      return "guardian";
    case "student":
      return "student";
    case "member":
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
  if (session.isSuperAdmin) {
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
  const result = access.find((a) => a.subdomain === subdomain) || null;

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

  // If school is suspended, only allow admins/owners to access specific roles/actions
  if (session.subscriptionStatus && session.subscriptionStatus !== "ACTIVE") {
    const isAdmin = ["owner", "admin"].includes(session.user.role);
    if (!isAdmin) return false;
    
    // Admins can only access 'owner' or 'admin' roles during suspension
    if (!["owner", "admin"].includes(role)) return false;
  }

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

export function getAllRolesInSchool(
  session: ExtendedSession,
  subdomain: string,
): string[] {
  if (session.isSuperAdmin) return ["superAdmin"];

  const access = getSchoolRole(session, subdomain);
  if (!access) return [];

  const roles = new Set<string>();

  // 1. Add profile roles first (e.g., teacher, student, etc.)
  access.profileRoles.forEach((role) => roles.add(role.toLowerCase()));

  // 2. Resolve organization roles — the member.role field may be
  //    comma-separated (e.g. "admin,teacher,guardian").
  //    Add each individual role, suppressing "member" when real roles exist.
  const membership = session.memberships.find(
    (m) => m.organization.school?.subdomain === subdomain,
  );
  const rawOrgRole = membership?.role ?? "";
  const orgRoles = rawOrgRole
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);

  for (const orgRole of orgRoles) {
    if (orgRole !== "member" || roles.size === 0) {
      roles.add(orgRole);
    }
  }

  // Fallback: if no org roles were split and we have a single organizationRole
  if (orgRoles.length === 0 && access.organizationRole) {
    const fallback = access.organizationRole.toLowerCase();
    if (fallback !== "member" || roles.size === 0) {
      roles.add(fallback);
    }
  }

  return Array.from(roles);
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

/**
 * Get the current active school role, considering the 'active role' cookie.
 * This should be used for authorization checks in role-specific dashboards.
 */
export async function getActiveSchoolRole(
  session: ExtendedSession,
  subdomain: string,
): Promise<SchoolAccess | null> {
  const schoolRole = getSchoolRole(session, subdomain);
  if (!schoolRole) return null;

  // We use dynamic import for next/headers as this file might be imported in non-server contexts
  // although this specific function should only be called in server environments.
  const cookieStore = await import("next/headers").then((mod) => mod.cookies());
  const activeRoleCookie = cookieStore.get(`sms_active_role_${subdomain}`)?.value;

  const allRoles = getAllRolesInSchool(session, subdomain);

  if (activeRoleCookie && allRoles.includes(activeRoleCookie)) {
    return {
      ...schoolRole,
      effectiveRole: activeRoleCookie as EffectiveRole,
    };
  }

  return schoolRole;
}
