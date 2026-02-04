// app/api/schools/[schoolId]/subscription/cancel/route.ts
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    schoolId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { schoolId } = params;

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
      (m) => m.role === "owner" || m.role === "admin",
    );

    if (!isSuperAdmin && !isOwnerOrAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!school.subscription) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 400 },
      );
    }

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
      { status: 500 },
    );
  }
}
