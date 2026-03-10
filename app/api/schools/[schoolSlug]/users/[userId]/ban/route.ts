import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";

/**
 * POST /api/schools/[schoolSlug]/users/[userId]/ban
 * Toggles the banned state for a user.
 * Body: { ban: boolean, reason?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; userId: string }> }
) {
  try {
    const { schoolSlug, userId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Only admins, owners, and super admins can ban users
    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { ban, reason } = await req.json();

    if (ban) {
      // Ban the user via Better Auth
      await auth.api.banUser({
        body: {
          userId,
          banReason: reason || "Banned by administrator",
          banExpiresIn: undefined, // permanent unless specified
        },
        headers: req.headers,
      });
    } else {
      // Unban the user via Better Auth
      await auth.api.unbanUser({
        body: { userId },
        headers: req.headers,
      });
    }

    // Also update teacher/staff isActive flag in our DB for consistency
    const teacher = await prisma.teacher.findFirst({
      where: { profile: { userId } },
      select: { id: true },
    });

    if (teacher) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { isActive: !ban },
      });
    } else {
      const staff = await prisma.staff.findFirst({
        where: { profile: { userId } },
        select: { id: true },
      });
      if (staff) {
        await prisma.staff.update({
          where: { id: staff.id },
          data: { isActive: !ban },
        });
      }
    }

    // Log to audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "USER",
        entityId: userId,
        newValues: {
          action: ban ? "BANNED" : "UNBANNED",
          reason: reason || null,
          performedBy: session.user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: ban ? "User has been banned." : "User has been unbanned.",
    });
  } catch (error) {
    console.error("[USER_BAN]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
