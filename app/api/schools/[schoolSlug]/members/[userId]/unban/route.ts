import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

type UnbanRouteContext = {
  params: Promise<{
    schoolSlug: string;
    userId: string;
  }>;
};

export async function POST(request: NextRequest, context: UnbanRouteContext) {
  try {
    const params = await context.params;
    const { schoolSlug, userId } = params;

    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Permission check
    const isSuperAdmin = session.isSuperAdmin;
    const isSchoolAdmin =
      role?.effectiveRole === "admin" || role?.effectiveRole === "owner";

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get school
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, organizationId: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // ── Use BetterAuth's admin.unbanUser ──────────────────────────────────────
    // This clears user.banned on the global user table, allowing sign-in again.
    const unbanResult = await auth.api.unbanUser({
      headers: await headers(),
      body: { userId },
    });

    if (!unbanResult) {
      return NextResponse.json(
        { error: "Failed to unban user via auth API" },
        { status: 500 },
      );
    }

    // Mirror to member.banned for org-level UI flags
    await prisma.member.update({
      where: {
        organizationId_userId: {
          organizationId: school.organizationId,
          userId: userId,
        },
      },
      data: {
        banned: false,
        banReason: null,
      },
    });

    // Update teacher/staff isActive flag for consistency
    const teacher = await prisma.teacher.findFirst({
      where: { profile: { userId } },
      select: { id: true },
    });

    if (teacher) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { isActive: true },
      });
    } else {
      const staff = await prisma.staff.findFirst({
        where: { profile: { userId } },
        select: { id: true },
      });
      if (staff) {
        await prisma.staff.update({
          where: { id: staff.id },
          data: { isActive: true },
        });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        schoolId: school.id,
        action: "UPDATE",
        entityType: "USER",
        entityId: userId,
        newValues: {
          action: "UNBANNED",
          performedBy: session.user.email,
        },
      },
    });

    console.log(`✅ User unbanned via BetterAuth: ${userId} in ${schoolSlug}`);

    return NextResponse.json({ message: "User unbanned successfully" });
  } catch (error) {
    console.error("❌ Error unbanning user:", error);
    return NextResponse.json(
      { error: "Failed to unban user" },
      { status: 500 },
    );
  }
}
