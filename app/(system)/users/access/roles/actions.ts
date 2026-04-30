// app/(system)/users/access/roles/actions.ts
"use server";

import { requireSuperAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import {
  getRoleDisplayName,
  getRoleDescription,
  getStaticRolePermissions,
  STATIC_ROLES,
} from "@/lib/auth/permissions";

const generateId = () => crypto.randomUUID();

// ============================================================================
// TYPES
// ============================================================================

export interface OrganizationForRoles {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  subscriptionStatus: string;
  memberCount: number;
}

export interface RoleForDisplay {
  id: string | null;
  name: string;
  label: string;
  description: string;
  permissions: Record<string, string[]>;
  isStatic: boolean;
  memberCount: number;
  organizationId: string;
}

// ============================================================================
// GET ALL ORGANIZATIONS
// ============================================================================

export async function getOrganizationsForRoleManagement(): Promise<{
  data: OrganizationForRoles[] | null;
  error: string | null;
}> {
  try {
    await requireSuperAdmin();

    const orgs = await prisma.organization.findMany({
      include: {
        _count: { select: { members: true } },
        school: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    return {
      data: orgs.map((org) => ({
        id: org.id,
        name: org.school?.name ?? org.name,
        slug: org.slug,
        logo: org.logo,
        subscriptionStatus: org.subscriptionStatus,
        memberCount: org._count.members,
      })),
      error: null,
    };
  } catch (err) {
    console.error("[getOrganizationsForRoleManagement] Error:", err);
    return { data: null, error: "Failed to fetch organizations" };
  }
}

// ============================================================================
// GET ROLES FOR AN ORGANIZATION (static defaults + dynamic custom)
// ============================================================================

export async function getRolesForOrganization(organizationId: string): Promise<{
  data: RoleForDisplay[] | null;
  error: string | null;
}> {
  try {
    await requireSuperAdmin();

    // Dynamic roles from DB
    const dynamicRoles = await prisma.organizationRole.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });

    // Member counts per role for this org
    const memberCounts = await prisma.member.groupBy({
      by: ["role"],
      where: { organizationId },
      _count: { role: true },
    });
    const countMap = new Map(memberCounts.map((m) => [m.role, m._count.role]));

    // Static (hardcoded) roles
    const staticRoles: RoleForDisplay[] = STATIC_ROLES.map((roleName) => ({
      id: null,
      name: roleName,
      label: getRoleDisplayName(
        roleName as Parameters<typeof getRoleDisplayName>[0],
      ),
      description: getRoleDescription(
        roleName as Parameters<typeof getRoleDescription>[0],
      ),
      permissions: getStaticRolePermissions(roleName) ?? {},
      isStatic: true,
      memberCount: countMap.get(roleName) ?? 0,
      organizationId,
    }));

    // Dynamic (custom) roles
    const customRoles: RoleForDisplay[] = dynamicRoles.map((r) => {
      let permissions: Record<string, string[]> = {};
      try {
        permissions = JSON.parse(r.permissions);
      } catch {
        /* empty */
      }
      return {
        id: r.id,
        name: r.role,
        label: r.role
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        description: "Custom role for this organization",
        permissions,
        isStatic: false,
        memberCount: countMap.get(r.role) ?? 0,
        organizationId,
      };
    });

    return { data: [...staticRoles, ...customRoles], error: null };
  } catch (err) {
    console.error("[getRolesForOrganization] Error:", err);
    return { data: null, error: "Failed to fetch roles" };
  }
}

// ============================================================================
// CREATE CUSTOM ROLE (direct Prisma — superadmin bypasses member check)
// ============================================================================

export async function createCustomRole(
  organizationId: string,
  roleName: string,
  permissions: Record<string, string[]>,
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireSuperAdmin();

    if (!/^[a-z][a-z0-9-]*$/.test(roleName)) {
      return {
        success: false,
        error:
          "Role name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.",
      };
    }

    const reserved = new Set([
      ...STATIC_ROLES,
      "owner",
      "superadmin",
      "user",
      "suspended",
    ]);
    if (reserved.has(roleName as (typeof STATIC_ROLES)[number])) {
      return {
        success: false,
        error: "This role name is reserved. Please choose a different name.",
      };
    }

    if (Object.keys(permissions).length === 0) {
      return {
        success: false,
        error: "At least one permission must be enabled.",
      };
    }

    // Check limit
    const count = await prisma.organizationRole.count({
      where: { organizationId },
    });
    if (count >= 10) {
      return {
        success: false,
        error: "This organization has reached the maximum of 10 custom roles.",
      };
    }

    // Check name uniqueness
    const existing = await prisma.organizationRole.findFirst({
      where: { organizationId, role: roleName },
    });
    if (existing) {
      return {
        success: false,
        error: `A role named "${roleName}" already exists for this organization.`,
      };
    }

    await prisma.organizationRole.create({
      data: {
        id: generateId(),
        organizationId,
        role: roleName,
        permissions: JSON.stringify(permissions),
      },
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error("[createCustomRole] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create role",
    };
  }
}

// ============================================================================
// UPDATE CUSTOM ROLE
// ============================================================================

export async function updateCustomRole(
  organizationId: string,
  roleId: string,
  _roleName: string,
  permissions: Record<string, string[]>,
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireSuperAdmin();

    if (Object.keys(permissions).length === 0) {
      return {
        success: false,
        error: "At least one permission must be enabled.",
      };
    }

    const existing = await prisma.organizationRole.findFirst({
      where: { id: roleId, organizationId },
    });
    if (!existing) {
      return { success: false, error: "Role not found." };
    }

    await prisma.organizationRole.update({
      where: { id: roleId },
      data: { permissions: JSON.stringify(permissions) },
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error("[updateCustomRole] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update role",
    };
  }
}

// ============================================================================
// DELETE CUSTOM ROLE
// ============================================================================

export async function deleteCustomRole(
  organizationId: string,
  roleId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireSuperAdmin();

    const roleRecord = await prisma.organizationRole.findFirst({
      where: { id: roleId, organizationId },
    });
    if (!roleRecord) {
      return { success: false, error: "Role not found." };
    }

    const membersWithRole = await prisma.member.count({
      where: { organizationId, role: roleRecord.role },
    });
    if (membersWithRole > 0) {
      return {
        success: false,
        error: `Cannot delete — ${membersWithRole} member(s) still assigned this role. Reassign them first.`,
      };
    }

    await prisma.organizationRole.delete({ where: { id: roleId } });

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error("[deleteCustomRole] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete role",
    };
  }
}
