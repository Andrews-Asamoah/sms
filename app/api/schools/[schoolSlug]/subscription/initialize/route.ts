import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import {
  getPlanById,
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
} from "@/lib/subscription-plans";

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

    const body = await request.json();
    const { planId, billingCycle, requestType } = body;

    const params = await context.params;
    const { schoolSlug } = params;

    if (requestType === "CARD_UPDATE") {
      // Find school to get owner email
      const school = await prisma.school.findFirst({
        where: {
          OR: [{ id: schoolSlug }, { subdomain: schoolSlug }],
        },
        include: {
          organization: {
            include: {
              members: {
                where: { userId: session.user.id },
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

      // Initialize a minimal transaction (GH₵0.10 = 10 pesewas) just to verify and tokenise card
      // Paystack requires a minimum charge to tokenize a card for future use.
      // The amount is not added to the subscription, it's a card verification fee.
      return await initializePaystackTransaction({
        email: session.user.email,
        amount: 10, // GH₵0.10 minimum for card verification
        school,
        plan: { id: "CARD_UPDATE", name: "Card Update", planType: "NONE", billingCycle: "NONE" },
        isUpgrade: false,
        schoolSlug,
        metadata: {
          type: "CARD_UPDATE",
          schoolId: school.id,
        }
      });
    }

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 },
      );
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Try to find school by ID first, then subdomain
    let school = await prisma.school.findFirst({
      where: {
        OR: [{ id: schoolSlug }, { subdomain: schoolSlug }],
      },
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
      // Fallback: check if organization slug matches
      const org = await prisma.organization.findUnique({
        where: { slug: schoolSlug },
        include: { school: true },
      });
      if (org && org.school) {
        school = await prisma.school.findUnique({
          where: { id: org.school.id },
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
      }
    }

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

    // 1. Check for existing active subscription to handle Upgrade/Downgrade
    const currentSubscription = school.subscription;
    const planPriority = { FREE: 0, BASIC: 1, STANDARD: 2, PREMIUM: 3 };

    if (
      currentSubscription &&
      currentSubscription.status === "ACTIVE" &&
      planId !== "FREE"
    ) {
      const currentPlanType = currentSubscription.planType;
      const newPlanType = plan.planType;

      const currentPriority =
        planPriority[currentPlanType as keyof typeof planPriority] || 0;
      const newPriority =
        planPriority[newPlanType as keyof typeof planPriority] || 0;

      // --- DOWNGRADE LOGIC ---
      if (
        newPriority < currentPriority ||
        (newPriority === currentPriority &&
          plan.billingCycle === "MONTHLY" &&
          currentSubscription.billingCycle === "YEARLY")
      ) {
        console.log(
          `[Subscription] Scheduling downgrade from ${currentPlanType} to ${newPlanType}`,
        );

        await prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            cancelAtPeriodEnd: true,
            settings: {
              ...((currentSubscription.settings as any) || {}),
              pendingPlanId: plan.id,
              switchType: "DOWNGRADE",
            },
          },
        });

        return NextResponse.json({
          success: true,
          message:
            "Your plan will be downgraded at the end of your current billing period.",
          scheduled: true,
        });
      }

      // --- UPGRADE LOGIC ---
      if (
        newPriority > currentPriority ||
        (newPriority === currentPriority &&
          plan.billingCycle === "YEARLY" &&
          currentSubscription.billingCycle === "MONTHLY")
      ) {
        console.log(
          `[Subscription] Calculating proration for upgrade from ${currentPlanType} to ${newPlanType}`,
        );

        const now = new Date();
        const periodEnd = currentSubscription.currentPeriodEnd
          ? new Date(currentSubscription.currentPeriodEnd)
          : new Date();
        const periodStart = currentSubscription.currentPeriodStart
          ? new Date(currentSubscription.currentPeriodStart)
          : new Date();

        const totalDuration = periodEnd.getTime() - periodStart.getTime();
        const remainingDuration = periodEnd.getTime() - now.getTime();

        const prorationRatio = Math.max(
          0,
          Math.min(1, remainingDuration / (totalDuration || 1)),
        );

        // Find current plan to get its price (approximate if not stored)
        const currentPlan = SUBSCRIPTION_PLANS.find(
          (p: SubscriptionPlan) =>
            p.planType === currentPlanType &&
            p.billingCycle === currentSubscription.billingCycle,
        ) || { price: 0 };

        const remainingValue = currentPlan.price * prorationRatio;
        const upgradeDifference = Math.max(0, plan.price - remainingValue);

        console.log(
          `[Subscription] Proration: Remaining=${remainingValue.toFixed(2)}, Diff=${upgradeDifference.toFixed(2)}`,
        );

        // Initialize transaction for the difference
        return await initializePaystackTransaction({
          email: session.user.email,
          amount: Math.round(upgradeDifference * 100),
          school,
          plan,
          isUpgrade: true,
          schoolSlug,
        });
      }
    }

    // --- NORMAL SUBSCRIPTION FLOW ---
    return await initializePaystackTransaction({
      email: session.user.email,
      amount: Math.round(plan.price * 100),
      school,
      plan,
      isUpgrade: false,
      schoolSlug,
    });
  } catch (error) {
    console.error("Error initializing subscription:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

async function initializePaystackTransaction({
  email,
  amount,
  school,
  plan,
  isUpgrade,
  schoolSlug,
  metadata = {},
}: {
  email: string;
  amount: number;
  school: any;
  plan: any;
  isUpgrade: boolean;
  schoolSlug: string;
  metadata?: any;
}) {
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) throw new Error("PAYSTACK_SECRET_KEY missing");

  const payload: any = {
    email,
    amount: amount,
    currency: "GHS",
    callback_url: `${(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/api/schools/${schoolSlug}/subscription/verify`,
    metadata: {
      schoolId: school.id,
      planId: plan.id,
      planType: plan.planType,
      billingCycle: plan.billingCycle,
      isUpgrade,
      ...metadata,
      custom_fields: [
        {
          display_name: "School Name",
          variable_name: "school_name",
          value: school.name,
        },
        {
          display_name: "Plan Name",
          variable_name: "plan_name",
          value: plan.name,
        },
        {
          display_name: "Type",
          variable_name: "type",
          value: metadata.type === "CARD_UPDATE" ? "Card Update" : (isUpgrade ? "Upgrade" : "New Subscription"),
        },
      ],
    },
  };

  // Only use plan code for NEW subscriptions or if we want Paystack to handle the recurring amount
  // If it's a prorated upgrade, we charge a one-time amount and then update the subscription code later
  if (!isUpgrade && plan.paystackPlanCode) {
    payload.plan = plan.paystackPlanCode;
  }

  const response = await fetch(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Paystack initialization failed:", errorData);
    return NextResponse.json(
      { error: "Payment initialization failed" },
      { status: 500 },
    );
  }

  const paystackData = await response.json();
  return NextResponse.json(paystackData.data);
}
