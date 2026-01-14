// app/api/schools/[schoolId]/subscription/trial/route.ts
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

    // Check if already has premium or trial
    if (
      school.subscription &&
      (school.subscription.planType === "PREMIUM" ||
        school.subscription.isOnTrial)
    ) {
      return NextResponse.json(
        { error: "School already has premium access" },
        { status: 400 }
      );
    }

    // Start 14-day trial
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    const subscription = await prisma.subscription.upsert({
      where: { schoolId },
      create: {
        schoolId,
        planType: "FREE",
        planName: "Premium Trial",
        status: "TRIALING",
        isOnTrial: true,
        trialStartsAt: trialStartDate,
        trialEndsAt: trialEndDate,
      },
      update: {
        planName: "Premium Trial",
        status: "TRIALING",
        isOnTrial: true,
        trialStartsAt: trialStartDate,
        trialEndsAt: trialEndDate,
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error starting trial:", error);
    return NextResponse.json(
      { error: "Failed to start trial" },
      { status: 500 }
    );
  }
}
