// lib/auth/super-admin.ts - REFACTORED Super Admin Operations

import prisma from "@/lib/prisma";
import {
  createOrganizationAsSuperAdmin,
  deleteOrganizationAsSuperAdmin,
  updateMemberRole,
  removeMemberFromOrganization,
  type ApiResult,
} from "./api";

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Ban/unban user system-wide - Super admin only
 */
export async function toggleUserBan(params: {
  superAdminId: string;
  targetUserId: string;
  ban: boolean;
  reason?: string;
  expiresAt?: Date;
}): Promise<ApiResult> {
  const { superAdminId, targetUserId, ban, reason, expiresAt } = params;

  try {
    // Verify super admin
    const superAdmin = await prisma.user.findUnique({
      where: { id: superAdminId },
      select: { role: true },
    });

    if (superAdmin?.role !== "superAdmin") {
      throw new Error("Super admin access required");
    }

    // Cannot ban another super admin
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true, email: true },
    });

    if (targetUser?.role === "superAdmin") {
      throw new Error("Cannot ban another super admin");
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        banned: ban,
        banReason: ban ? reason : null,
        banExpires: ban ? expiresAt : null,
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: superAdminId,
        action: "UPDATE",
        entityType: "USER",
        entityId: targetUserId,
        oldValues: { banned: !ban },
        newValues: {
          banned: ban,
          banReason: reason,
          banExpires: expiresAt,
        },
      },
    });

    return { data: updatedUser };
  } catch (error) {
    console.error("[SuperAdmin] Error toggling ban:", error);
    return {
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      },
    };
  }
}

// ============================================================================
// ORGANIZATION LISTING & DETAILS
// ============================================================================

/**
 * List all organizations - Super admin view
 */
export async function listAllOrganizations(userId: string): Promise<ApiResult> {
  try {
    // Verify super admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== "superAdmin") {
      throw new Error("Super admin access required");
    }

    const organizations = await prisma.organization.findMany({
      include: {
        school: {
          include: {
            subscription: true,
            _count: {
              select: {
                students: true,
                teachers: true,
                staff: true,
                guardians: true,
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            invitations: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { data: organizations };
  } catch (error) {
    console.error("[SuperAdmin] Error listing organizations:", error);
    return {
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      },
    };
  }
}

/**
 * Get detailed organization info - Super admin view
 */
export async function getOrganizationDetails(
  userId: string,
  organizationId: string,
): Promise<ApiResult> {
  try {
    // Verify super admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== "superAdmin") {
      throw new Error("Super admin access required");
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        school: {
          include: {
            subscription: true,
            academicYears: {
              orderBy: { startDate: "desc" },
              take: 5,
            },
            _count: {
              select: {
                students: true,
                teachers: true,
                staff: true,
                guardians: true,
                classes: true,
                departments: true,
                subjects: true,
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                banned: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        invitations: {
          where: {
            status: "pending",
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    return { data: organization };
  } catch (error) {
    console.error("[SuperAdmin] Error getting organization details:", error);
    return {
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      },
    };
  }
}

// ============================================================================
// SYSTEM STATISTICS
// ============================================================================

/**
 * Get system statistics - Super admin dashboard
 */
export async function getSystemStats(userId: string): Promise<ApiResult> {
  try {
    // Verify super admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== "superAdmin") {
      throw new Error("Super admin access required");
    }

    const [
      totalOrganizations,
      totalSchools,
      totalUsers,
      totalStudents,
      totalTeachers,
      totalStaff,
      activeSubscriptions,
      bannedUsers,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.school.count(),
      prisma.user.count(),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.staff.count(),
      prisma.subscription.count({
        where: { status: "ACTIVE" },
      }),
      prisma.user.count({
        where: { banned: true },
      }),
    ]);

    const stats = {
      organizations: totalOrganizations,
      schools: totalSchools,
      users: totalUsers,
      students: totalStudents,
      teachers: totalTeachers,
      staff: totalStaff,
      activeSubscriptions,
      bannedUsers,
    };

    return { data: stats };
  } catch (error) {
    console.error("[SuperAdmin] Error getting system stats:", error);
    return {
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      },
    };
  }
}

// ============================================================================
// MEMBER MANAGEMENT (delegates to API)
// ============================================================================

/**
 * Remove member from organization - Super admins can remove anyone
 */
export async function removeMemberAsSuperAdmin(params: {
  userId: string;
  organizationId: string;
  memberUserId: string;
}): Promise<ApiResult> {
  const { userId, organizationId, memberUserId } = params;

  try {
    // Verify super admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== "superAdmin") {
      throw new Error("Super admin access required");
    }

    // Find the member
    const member = await prisma.member.findFirst({
      where: {
        userId: memberUserId,
        organizationId,
      },
    });

    if (!member) {
      throw new Error("Member not found in organization");
    }

    // Use API function
    return await removeMemberFromOrganization(organizationId, member.id);
  } catch (error) {
    console.error("[SuperAdmin] Error removing member:", error);
    return {
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      },
    };
  }
}

/**
 * Update member role - Super admins can change any role
 */
export async function updateMemberRoleAsSuperAdmin(params: {
  userId: string;
  organizationId: string;
  memberUserId: string;
  newRole: "OWNER" | "ADMIN" | "MEMBER";
}): Promise<ApiResult> {
  const { userId, organizationId, memberUserId, newRole } = params;

  try {
    // Verify super admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== "superAdmin") {
      throw new Error("Super admin access required");
    }

    // Find the member
    const member = await prisma.member.findFirst({
      where: {
        userId: memberUserId,
        organizationId,
      },
    });

    if (!member) {
      throw new Error("Member not found in organization");
    }

    // Use API function
    return await updateMemberRole(organizationId, member.id, newRole);
  } catch (error) {
    console.error("[SuperAdmin] Error updating member role:", error);
    return {
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      },
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const SuperAdmin = {
  // Organization operations (delegates to API)
  createOrganization: createOrganizationAsSuperAdmin,
  deleteOrganization: deleteOrganizationAsSuperAdmin,
  listAllOrganizations,
  getOrganizationDetails,

  // Member operations (delegates to API)
  removeMember: removeMemberAsSuperAdmin,
  updateMemberRole: updateMemberRoleAsSuperAdmin,

  // User management
  toggleUserBan,

  // Statistics
  getSystemStats,
} as const;
