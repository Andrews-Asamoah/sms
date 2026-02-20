// app/api/schools/[schoolId]/subscription/upgrade/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { schoolSlug } = params;

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
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

    const subscription = await prisma.subscription.upsert({
      where: { schoolId: school.id },
      create: {
        schoolId: school.id,
        planType: "PREMIUM",
        planName: "Premium Plan",
        billingCycle: "MONTHLY",
        status: "ACTIVE",
        amount: 99.0,
        currency: "USD",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(
          new Date().setMonth(new Date().getMonth() + 1),
        ),
        isOnTrial: false,
        trialStartsAt: null,
        trialEndsAt: null,
      },
      update: {
        planType: "PREMIUM",
        planName: "Premium Plan",
        status: "ACTIVE",
        amount: 99.0,
        isOnTrial: false,
        trialStartsAt: null,
        trialEndsAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(
          new Date().setMonth(new Date().getMonth() + 1),
        ),
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    return NextResponse.json(
      { error: "Failed to upgrade subscription" },
      { status: 500 },
    );
  }
}
