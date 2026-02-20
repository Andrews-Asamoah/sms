// ============================================================
// app/api/schools/[schoolId]/members/[userId]/unban/route.ts
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

type UnbanRouteContext = {
  params: Promise<{
    schoolSlug: string;
    userId: string;
  }>;
};

export async function POST(request: NextRequest, context: UnbanRouteContext) {
  try {
    const session = await getAuthSession();
    if (!session?.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const { userId } = params;

    // Unban the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        banned: false,
        banReason: null,
        banExpires: null,
      },
    });

    console.log(`✅ User unbanned: ${userId}`);

    return NextResponse.json({
      message: "User unbanned successfully",
    });
  } catch (error) {
    console.error("❌ Error unbanning user:", error);
    return NextResponse.json(
      { error: "Failed to unban user" },
      { status: 500 },
    );
  }
}
