import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
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

    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Permission check: SuperAdmin can global ban. Admin/Owner can org ban.
    const isSuperAdmin = session.isSuperAdmin;
    const isSchoolAdmin =
      role?.effectiveRole === "admin" || role?.effectiveRole === "owner";

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get school ID
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

    if (isSuperAdmin) {
      // Global Ban: Ban the user and revoke sessions
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            banned: true,
            banReason: "Banned by system administrator",
            banExpires: null,
          },
        }),
        prisma.session.deleteMany({
          where: { userId },
        }),
      ]);
      console.log(`✅ User globally banned: ${userId}`);
    } else {
      // Organization Ban: Set member.banned = true
      await prisma.member.update({
        where: {
          organizationId_userId: {
            organizationId: school.organizationId,
            userId: userId,
          },
        },
        data: {
          banned: true,
          banReason: "Suspended by school administrator",
        },
      });
      console.log(
        `✅ User organizationally banned: ${userId} in ${schoolSlug}`,
      );
    }

    return NextResponse.json({
      message: isSuperAdmin
        ? "User banned globally"
        : "User suspended from school",
    });
  } catch (error) {
    console.error("❌ Error banning user:", error);
    return NextResponse.json({ error: "Failed to ban user" }, { status: 500 });
  }
}
