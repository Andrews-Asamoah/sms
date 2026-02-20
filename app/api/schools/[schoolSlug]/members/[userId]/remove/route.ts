// app/api/schools/[schoolId]/members/[userId]/remove/route.ts - FIXED
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    schoolSlug: string;
    userId: string;
  }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { schoolSlug, userId } = params;

    // Get the school to find the organizationId
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: {
        organizationId: true,
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use Better Auth's removeMember API
    // This automatically:
    // 1. Validates permissions
    // 2. Removes the member
    // 3. Triggers beforeRemoveMember and afterRemoveMember hooks
    const result = await auth.api.removeMember({
      body: {
        memberIdOrEmail: user.email,
        organizationId: school.organizationId,
      },
      headers: await headers(),
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 400 },
      );
    }

    console.log(`✅ Member removed: ${user.email}`);

    return NextResponse.json({
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("❌ Error removing member:", error);
    return NextResponse.json(
      {
        error: "Failed to remove member",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
