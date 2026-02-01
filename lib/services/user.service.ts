// lib/services/user.service.ts - User-related business logic
import prisma from "@/lib/prisma";
import { Gender } from "@/lib/generated/prisma/client";
import { logger } from "@/lib/utils/logger";

// ============================================================================
// USER PROFILE OPERATIONS
// ============================================================================

/**
 * Create a user profile for a new user
 * @param userId - User ID
 * @param fullName - Full name to parse into first/last name
 * @returns Created user profile
 */
export async function createUserProfile(userId: string, fullName: string) {
  logger.info("Creating user profile", { userId });

  try {
    // Check if profile already exists
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      logger.info("Profile already exists", { userId });
      return existingProfile;
    }

    // Parse name into first and last name
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "User";
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Profile";

    // Create profile
    const profile = await prisma.userProfile.create({
      data: {
        userId,
        firstName,
        lastName,
        phone: null,
        gender: Gender.OTHER,
        dateOfBirth: new Date("2000-01-01"), // Default date
        isActive: true,
      },
    });

    logger.info("User profile created successfully", {
      userId,
      profileId: profile.id,
    });
    return profile;
  } catch (error) {
    logger.error("Failed to create user profile", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Get user profile with all related data
 */
export async function getUserProfile(userId: string) {
  return prisma.userProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
        },
      },
      student: {
        include: {
          school: true,
          class: true,
        },
      },
      teacher: {
        include: {
          school: true,
          department: true,
        },
      },
      staff: {
        include: {
          school: true,
        },
      },
      guardian: {
        include: {
          school: true,
          students: {
            include: {
              student: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    gender?: Gender;
    dateOfBirth?: Date;
    residentialAddress?: string;
    city?: string;
    region?: string;
  },
) {
  logger.info("Updating user profile", { userId });

  try {
    const profile = await prisma.userProfile.update({
      where: { userId },
      data,
    });

    logger.info("User profile updated successfully", { userId });
    return profile;
  } catch (error) {
    logger.error("Failed to update user profile", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

// ============================================================================
// AUDIT LOG OPERATIONS
// ============================================================================

export interface CreateAuditLogParams {
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT";
  entityType: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  const {
    userId,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
  } = params;

  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValues: oldValues ? (oldValues as any) : undefined,
        newValues: newValues ? (newValues as any) : undefined,
        ipAddress,
        userAgent,
      },
    });

    logger.debug("Audit log created", {
      auditLogId: auditLog.id,
      action,
      entityType,
    });

    return auditLog;
  } catch (error) {
    logger.error("Failed to create audit log", {
      userId,
      action,
      entityType,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Don't throw - audit log failures shouldn't break main operations
    return null;
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(userId: string, limit = 50) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get audit logs for an entity
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  limit = 50,
) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}
