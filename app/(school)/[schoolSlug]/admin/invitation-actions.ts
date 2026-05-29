"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Server action to cancel/delete a pending or expired invitation.
 */
export async function cancelInvitationAction(
  schoolSlug: string,
  invitationId: string,
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner"
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, organizationId: true },
    });

    if (!school) {
      return { success: false, error: "School not found" };
    }

    // 1. Fetch invitation details before deleting
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId: school.organizationId,
      },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    // 2. Call Better Auth to cancel/delete the invitation
    try {
      await auth.api.cancelInvitation({
        headers: {
          "x-organization-id": school.organizationId,
          ...(await headers()),
        },
        body: {
          invitationId: invitation.id,
        },
      });
    } catch (authError) {
      console.warn(
        `[CANCEL_INVITATION] Better Auth API call failed/warned, fallback to direct DB delete:`,
        authError,
      );
      // Fallback: manually delete from DB if Better Auth fails or is bypassed
      await prisma.invitation.deleteMany({
        where: {
          id: invitationId,
          organizationId: school.organizationId,
        },
      });
    }

    // 3. Clean up the associated guardian/teacher record if any (when profileId is null)
    if (invitation.role?.toLowerCase() === "guardian") {
      const pendingGuardian = await prisma.guardian.findFirst({
        where: {
          email: invitation.email,
          schoolId: school.id,
          profileId: null,
        },
      });

      if (pendingGuardian) {
        await prisma.guardian.delete({
          where: { id: pendingGuardian.id },
        });
      }
    } else if (invitation.role?.toLowerCase() === "teacher") {
      const pendingTeacher = await prisma.teacher.findFirst({
        where: {
          invitationEmail: invitation.email,
          schoolId: school.id,
          profileId: null,
        },
      });

      if (pendingTeacher) {
        await prisma.teacher.delete({
          where: { id: pendingTeacher.id },
        });
      }
    }

    revalidatePath(`/${schoolSlug}/admin/staff`);
    revalidatePath(`/${schoolSlug}/admin/guardians`);
    revalidatePath(`/${schoolSlug}/admin/teachers`);
    return { success: true, message: "Invitation cancelled successfully" };
  } catch (error) {
    console.error("[CANCEL_INVITATION_ACTION] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to cancel invitation",
    };
  }
}

/**
 * Server action to resend a pending or expired invitation.
 */
export async function resendInvitationAction(
  schoolSlug: string,
  invitationId: string,
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner"
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, organizationId: true },
    });

    if (!school) {
      return { success: false, error: "School not found" };
    }

    // 1. Fetch existing invitation details
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId: school.organizationId,
      },
    });

    if (!existingInvitation) {
      return { success: false, error: "Invitation not found" };
    }

    const targetEmail = existingInvitation.email;
    const targetRole = existingInvitation.role;

    if (!targetRole) {
      return { success: false, error: "Invitation has no role specified" };
    }

    // 2. Delete the old invitation to prevent Better Auth or unique constraint conflicts
    try {
      await auth.api.cancelInvitation({
        headers: {
          "x-organization-id": school.organizationId,
          ...(await headers()),
        },
        body: {
          invitationId: existingInvitation.id,
        },
      });
    } catch (cancelError) {
      console.warn(
        `[RESEND_INVITATION] Cancel old invitation API failed, direct DB delete:`,
        cancelError,
      );
      await prisma.invitation.deleteMany({
        where: {
          id: existingInvitation.id,
          organizationId: school.organizationId,
        },
      });
    }

    // 3. Create a brand new invitation via Better Auth API
    const reqHeaders = await headers();
    const result = await auth.api.createInvitation({
      body: {
        organizationId: school.organizationId,
        email: targetEmail,
        role: targetRole.toLowerCase() as any,
      },
      headers: reqHeaders,
    });

    if (!result) {
      return { success: false, error: "Failed to recreate invitation via Better Auth" };
    }

    revalidatePath(`/${schoolSlug}/admin/staff`);
    revalidatePath(`/${schoolSlug}/admin/guardians`);
    revalidatePath(`/${schoolSlug}/admin/teachers`);
    return { success: true, message: "Invitation resent successfully" };
  } catch (error) {
    console.error("[RESEND_INVITATION_ACTION] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to resend invitation",
    };
  }
}
