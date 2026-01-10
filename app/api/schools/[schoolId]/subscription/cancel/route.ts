// app/api/schools/[schoolId]/subscription/cancel/route.ts
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { RouteContext } from "@/app/api/schools/[schoolId]/subscription/upgrade/route";

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { schoolId } = params;

    // Check permissions
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        subscription: true,
        organization: {
          include: {
            members: {
              where: {
                userId: session.user.id,
              },
            },
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const isSuperAdmin = session.user.role === "superAdmin";
    const isOwnerOrAdmin = school.organization.members.some(
      (m) => m.role === "OWNER" || m.role === "ADMIN"
    );

    if (!isSuperAdmin && !isOwnerOrAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!school.subscription) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 400 }
      );
    }

    // Update subscription to cancel at period end
    const subscription = await prisma.subscription.update({
      where: { schoolId },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
