import { NextRequest, NextResponse } from "next/server";
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

    // Permission check: SuperAdmin can global unban. Admin/Owner can org unban.
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

    if (isSuperAdmin) {
      // Global Unban: Unban the user
      await prisma.user.update({
        where: { id: userId },
        data: {
          banned: false,
          banReason: null,
          banExpires: null,
        },
      });
      console.log(`✅ User globally unbanned: ${userId}`);
    } else {
      // Organization Unban: Set member.banned = false
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
      console.log(
        `✅ User organizationally unbanned: ${userId} in ${schoolSlug}`,
      );
    }

    return NextResponse.json({
      message: isSuperAdmin
        ? "User unbanned globally"
        : "User unsuspended from school",
    });
  } catch (error) {
    console.error("❌ Error unbanning user:", error);
    return NextResponse.json(
      { error: "Failed to unban user" },
      { status: 500 },
    );
  }
}
