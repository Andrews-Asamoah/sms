import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

type BanRouteContext = {
  params: Promise<{
    schoolSlug: string;
    userId: string;
  }>;
};

export async function POST(request: NextRequest, context: BanRouteContext) {
  try {
    const params = await context.params;
    const { schoolSlug, userId } = params;

    const body = await request.json().catch(() => ({}));
    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        { error: "Ban reason is required" },
        { status: 400 },
      );
    }

    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Permission check: SuperAdmin can global ban. Admin/Owner can org ban.
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

    // Can't ban yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot ban yourself" },
        { status: 400 },
      );
    }

    // Prevent banning the school owner if you're just an admin
    if (!isSuperAdmin && role?.effectiveRole === "admin") {
      const targetMember = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: school.organizationId,
            userId: userId,
          },
        },
      });
      if (targetMember?.role === "owner") {
        return NextResponse.json(
          { error: "Admins cannot ban the school owner" },
          { status: 403 },
        );
      }
    }

    // ── Use BetterAuth's admin.banUser ────────────────────────────────────────
    // This is the ONLY correct way to ban a user so that:
    //   1. user.banned = true is set on the global user table (what sign-in checks)
    //   2. All existing sessions are immediately invalidated
    //   3. banReason is persisted on the user record
    const banResult = await auth.api.banUser({
      headers: await headers(),
      body: {
        userId,
        banReason: reason,
      },
    });

    if (!banResult) {
      return NextResponse.json(
        { error: "Failed to ban user via auth API" },
        { status: 500 },
      );
    }

    // Also mirror to member.banned for org-level UI flags / ban-reason lookup
    await prisma.member.update({
      where: {
        organizationId_userId: {
          organizationId: school.organizationId,
          userId: userId,
        },
      },
      data: {
        banned: true,
        banReason: reason,
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
        data: { isActive: false },
      });
    } else {
      const staff = await prisma.staff.findFirst({
        where: { profile: { userId } },
        select: { id: true },
      });
      if (staff) {
        await prisma.staff.update({
          where: { id: staff.id },
          data: { isActive: false },
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
          action: "BANNED",
          banReason: reason,
          performedBy: session.user.email,
        },
      },
    });

    console.log(`✅ User banned via BetterAuth: ${userId} in ${schoolSlug}`);

    return NextResponse.json({ message: "User banned successfully" });
  } catch (error) {
    console.error("❌ Error banning user:", error);
    return NextResponse.json({ error: "Failed to ban user" }, { status: 500 });
  }
}
