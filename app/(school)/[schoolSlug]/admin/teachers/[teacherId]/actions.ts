"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { auth } from "@/lib/auth";

export async function updateTeacherAssignments(
  schoolSlug: string,
  teacherId: string,
  data: {
    departmentId?: string;
    houseId?: string | null;
    subjectIds?: string[];
  },
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher"
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const { departmentId, houseId, subjectIds } = data;

    await prisma.$transaction(async (tx) => {
      // Update Teacher core fields
      if (departmentId || houseId !== undefined) {
        await tx.teacher.update({
          where: { id: teacherId },
          data: {
            ...(departmentId && { departmentId }),
            ...(houseId !== undefined && { houseId }),
          },
        });
      }

      // Update Subject Assignments if provided
      if (subjectIds) {
        // Remove existing assignments
        await tx.subjectTeacher.deleteMany({
          where: { teacherId },
        });

        // Create new assignments
        if (subjectIds.length > 0) {
          await tx.subjectTeacher.createMany({
            data: subjectIds.map((subjectId) => ({
              teacherId,
              subjectId,
            })),
          });
        }
      }
    });

    revalidatePath(`/${schoolSlug}/admin/teachers/${teacherId}`);
    return { success: true, message: "Assignments updated successfully" };
  } catch (error) {
    console.error("[UPDATE_TEACHER_ASSIGNMENTS] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update assignments",
    };
  }
}

export async function cancelTeacherInvitation(
  schoolSlug: string,
  teacherId: string,
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher"
    ) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Get Teacher to find email and school
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { school: true },
    });

    if (!teacher || teacher.school.subdomain !== schoolSlug) {
      return { success: false, error: "Teacher record not found" };
    }

    if (teacher.profileId) {
      return {
        success: false,
        error: "Cannot cancel invitation for an active teacher",
      };
    }

    const invitationEmail = teacher.invitationEmail;
    if (!invitationEmail) {
      return {
        success: false,
        error: "Teacher has no associated invitation email",
      };
    }

    // 2. Find BetterAuth invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        email: invitationEmail,
        organizationId: teacher.school.organizationId,
        status: { in: ["pending", "expired"] },
      },
    });

    // 3. Cancel in BetterAuth if found
    if (invitation) {
      try {
        await auth.api.cancelInvitation({
          headers: {
            "x-organization-id": teacher.school.organizationId,
          },
          body: {
            invitationId: invitation.id,
          },
        });
      } catch (authError) {
        console.warn(
          "[CANCEL_INVITE] BetterAuth cancellation failed:",
          authError,
        );
        // We continue anyway to clean up the Teacher record unless it's a critical error
      }
    }

    // 4. Delete Teacher record
    await prisma.teacher.delete({
      where: { id: teacherId },
    });

    revalidatePath(`/${schoolSlug}/admin/teachers`);
    return { success: true, message: "Invitation cancelled successfully" };
  } catch (error) {
    console.error("[CANCEL_TEACHER_INVITATION] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to cancel invitation",
    };
  }
}
