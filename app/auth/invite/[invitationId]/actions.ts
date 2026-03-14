"use server";

import prisma from "@/lib/prisma";

export async function verifyInvitationStatus(invitationId: string) {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { status: true, expiresAt: true },
    });

    if (!invitation) {
      return { valid: false, error: "Invitation no longer exists." };
    }

    if (invitation.status !== "pending") {
      return { valid: false, error: `Invitation is already ${invitation.status}.` };
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return { valid: false, error: "Invitation has expired." };
    }

    return { valid: true };
  } catch (error) {
    console.error("[VERIFY_INVITATION] Error:", error);
    return { valid: false, error: "Failed to verify invitation status." };
  }
}
