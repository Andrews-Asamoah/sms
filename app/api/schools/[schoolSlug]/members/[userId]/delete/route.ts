// ============================================================
// app/api/schools/[schoolId]/members/[userId]/delete/route.ts
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

type DeleteRouteContext = {
  params: Promise<{
    schoolId: string;
    userId: string;
  }>;
};

export async function DELETE(
  request: NextRequest,
  context: DeleteRouteContext
) {
  try {
    const session = await getAuthSession();
    if (!session?.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const { userId } = params;

    // Can't delete yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Get user to check if they're a super admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Extra protection: Can't delete other super admins
    if (user.role === "superAdmin") {
      return NextResponse.json(
        { error: "Cannot delete super admin accounts" },
        { status: 403 }
      );
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    console.log(`✅ User account deleted: ${userId}`);

    return NextResponse.json({
      message: "User account deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user account" },
      { status: 500 }
    );
  }
}
