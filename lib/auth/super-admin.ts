// lib/auth/super-admin.ts - Super Admin Operations
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * Check if user is a super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === "superAdmin";
}

/**
 * Require super admin access or throw
 */
export async function requireSuperAdmin(userId: string): Promise<void> {
  const isSuper = await isSuperAdmin(userId);
  if (!isSuper) {
    throw new Error("Super admin access required");
  }
}

/**
 * Create organization (school) - Only super admins
 */
export async function createOrganizationAsSuperAdmin(params: {
  userId: string;
  name: string;
  slug: string;
}) {
  const { userId, name, slug } = params;

  // Verify super admin
  await requireSuperAdmin(userId);

  // Use Better Auth API to create organization
  const result = await auth.api.createOrganization({
    body: {
      name,
      slug,
      userId, // SuperAdmin will be added as OWNER automatically
    },
    headers: await headers(),
  });

  return result;
}

/**
 * Delete organization - Only super admins can do this
 */
export async function deleteOrganizationAsSuperAdmin(params: {
  userId: string;
  organizationId: string;
}) {
  const { userId, organizationId } = params;

  // Verify super admin
  await requireSuperAdmin(userId);

  // Get organization with school
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      school: true,
      members: true,
      invitations: true,
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Delete organization and related data
  await prisma.$transaction(async (tx) => {
    // 1. Delete school if exists
    if (organization.school) {
      // This will cascade delete most school data
      await tx.school.delete({
        where: { id: organization.school.id },
      });
    }

    // 2. Delete invitations
    await tx.invitation.deleteMany({
      where: { organizationId },
    });

    // 3. Delete members
    await tx.member.deleteMany({
      where: { organizationId },
    });

    // 4. Delete organization
    await tx.organization.delete({
      where: { id: organizationId },
    });
  });

  // Log deletion
  await prisma.auditLog.create({
    data: {
      userId,
      action: "DELETE",
      entityType: "ORGANIZATION",
      entityId: organizationId,
      oldValues: {
        name: organization.name,
        slug: organization.slug,
        schoolId: organization.school?.id,
      },
    },
  });

  return { success: true, organizationId };
}

/**
 * Remove member from organization - Super admins can remove anyone
 */
export async function removeMemberAsSuperAdmin(params: {
  userId: string;
  organizationId: string;
  memberUserId: string;
}) {
  const { userId, organizationId, memberUserId } = params;

  // Verify super admin
  await requireSuperAdmin(userId);

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

  // Use Better Auth API to remove member
  const result = await auth.api.removeMember({
    body: {
      organizationId,
      memberIdOrEmail: member.id,
    },
    headers: await headers(),
  });

  return result;
}

/**
 * Update member role - Super admins can change any role
 */
export async function updateMemberRoleAsSuperAdmin(params: {
  userId: string;
  organizationId: string;
  memberUserId: string;
  newRole: "OWNER" | "ADMIN" | "MEMBER";
}) {
  const { userId, organizationId, memberUserId, newRole } = params;

  // Verify super admin
  await requireSuperAdmin(userId);

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

  // Use Better Auth API to update role
  const result = await auth.api.updateMemberRole({
    body: {
      organizationId,
      memberId: member.id,
      role: newRole.toLowerCase() as "owner" | "admin" | "member",
    },
    headers: await headers(),
  });

  return result;
}

/**
 * List all organizations - Super admin view
 */
export async function listAllOrganizations(userId: string) {
  // Verify super admin
  await requireSuperAdmin(userId);

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

  return organizations;
}

/**
 * Get detailed organization info - Super admin view
 */
export async function getOrganizationDetails(
  userId: string,
  organizationId: string
) {
  // Verify super admin
  await requireSuperAdmin(userId);

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

  return organization;
}

/**
 * Ban/unban user system-wide - Super admin only
 */
export async function toggleUserBan(params: {
  superAdminId: string;
  targetUserId: string;
  ban: boolean;
  reason?: string;
  expiresAt?: Date;
}) {
  const { superAdminId, targetUserId, ban, reason, expiresAt } = params;

  // Verify super admin
  await requireSuperAdmin(superAdminId);

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

  return updatedUser;
}

/**
 * Get system statistics - Super admin dashboard
 */
export async function getSystemStats(userId: string) {
  // Verify super admin
  await requireSuperAdmin(userId);

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

  return {
    organizations: totalOrganizations,
    schools: totalSchools,
    users: totalUsers,
    students: totalStudents,
    teachers: totalTeachers,
    staff: totalStaff,
    activeSubscriptions,
    bannedUsers,
  };
}
