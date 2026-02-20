// ============================================================
// app/api/schools/[schoolId]/members/[userId]/ban/route.ts
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

type BanRouteContext = {
  params: Promise<{
    schoolSlug: string;
    userId: string;
  }>;
};

export async function POST(request: NextRequest, context: BanRouteContext) {
  try {
    const session = await getAuthSession();
    if (!session?.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const { userId } = params;

    // Can't ban yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot ban yourself" },
        { status: 400 },
      );
    }

    // Ban the user and revoke sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          banned: true,
          banReason: "Banned by administrator",
          banExpires: null,
        },
      }),
      prisma.session.deleteMany({
        where: { userId },
      }),
    ]);

    console.log(`✅ User banned: ${userId}`);

    return NextResponse.json({
      message: "User banned successfully",
    });
  } catch (error) {
    console.error("❌ Error banning user:", error);
    return NextResponse.json({ error: "Failed to ban user" }, { status: 500 });
  }
}
