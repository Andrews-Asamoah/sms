// app/api/schools/[schoolSlug]/subscription/initialize/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyApiSchoolAccess } from "@/lib/auth/guards";
import prisma from "@/lib/prisma";
import {
  getPlanById,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from "@/lib/subscription-plans";

type RouteContext = {
  params: Promise<{ schoolSlug: string }>;
};

// ============================================================================
// POST — initialize a Paystack payment
// ============================================================================

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { schoolSlug } = await context.params;
    const access = await verifyApiSchoolAccess(schoolSlug, ["owner", "admin"]);
    if (!access.authorized) return access.errorResponse;
    const { session } = access;

    const body = await request.json();
    const { planId, billingCycle, requestType } = body;

    // ── Load school once — used for all flows ────────────────────────────────
    const school = await prisma.school.findFirst({
      where: {
        OR: [{ id: schoolSlug }, { subdomain: schoolSlug }],
      },
      include: {
        subscription: true,
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // ── Card update flow ──────────────────────────────────────────────────────
    //
    // Initializes a minimal GH₵0.10 transaction to verify and tokenize a new
    // card. This is a Paystack requirement — no subscription plan is attached.
    //
    if (requestType === "CARD_UPDATE") {
      return initializePaystackTransaction({
        email: session.user.email,
        amount: 10, // 10 pesewas = GH₵0.10 minimum
        school,
        planId: null,
        planName: "Card Update",
        isUpgrade: false,
        schoolSlug,
        extraMetadata: {
          type: "CARD_UPDATE",
          schoolId: school.id,
        },
      });
    }

    // ── Subscription flow ─────────────────────────────────────────────────────
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

    const currentSubscription = school.subscription;

    // ── Pending invoice gate ──────────────────────────────────────────────────
    //
    // Industry standard: block plan changes while any unpaid invoice is
    // outstanding. The school admin must settle the balance first. However,
    // they are allowed to pay/renew their CURRENT plan to clear the invoice.
    //
    if (currentSubscription) {
      const pendingInvoice = await prisma.invoiceRecord.findFirst({
        where: {
          subscriptionId: currentSubscription.id,
          status: "PENDING",
        },
        select: { id: true },
      });

      if (pendingInvoice) {
        // Determine if the requested plan is the same plan (renewal/payment)
        // or a different plan (upgrade/downgrade/switch).
        const currentPlanId = SUBSCRIPTION_PLANS.find(
          (p: SubscriptionPlan) =>
            p.planType === currentSubscription.planType &&
            p.billingCycle === currentSubscription.billingCycle,
        )?.id;

        const isSwitchingPlans = planId !== currentPlanId;

        if (isSwitchingPlans) {
          return NextResponse.json(
            {
              error:
                "You have an outstanding unpaid invoice. Please settle all pending invoices before changing your subscription plan. You may renew your current plan to resolve the outstanding balance.",
            },
            { status: 402 },
          );
        }
      }
    }

    const planPriority: Record<string, number> = {
      FREE: 0,
      BASIC: 1,
      STANDARD: 2,
      PREMIUM: 3,
    };

    if (
      currentSubscription &&
      currentSubscription.status === "ACTIVE" &&
      planId !== "FREE"
    ) {
      const currentPriority = planPriority[currentSubscription.planType] ?? 0;
      const newPriority = planPriority[plan.planType] ?? 0;

      // ── Downgrade: schedule for end of billing period ────────────────────
      if (
        newPriority < currentPriority ||
        (newPriority === currentPriority &&
          plan.billingCycle === "MONTHLY" &&
          currentSubscription.billingCycle === "YEARLY")
      ) {
        await prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            cancelAtPeriodEnd: true,
            settings: {
              ...((currentSubscription.settings as Record<string, unknown>) ??
                {}),
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

      // ── Upgrade: charge the prorated difference now ───────────────────────
      if (
        newPriority > currentPriority ||
        (newPriority === currentPriority &&
          plan.billingCycle === "YEARLY" &&
          currentSubscription.billingCycle === "MONTHLY")
      ) {
        const now = new Date();
        const periodEnd = currentSubscription.currentPeriodEnd
          ? new Date(currentSubscription.currentPeriodEnd)
          : now;
        const periodStart = currentSubscription.currentPeriodStart
          ? new Date(currentSubscription.currentPeriodStart)
          : now;

        const totalDuration = periodEnd.getTime() - periodStart.getTime();
        const remainingDuration = Math.max(
          0,
          periodEnd.getTime() - now.getTime(),
        );
        const prorationRatio = remainingDuration / (totalDuration || 1);

        const currentPlan = SUBSCRIPTION_PLANS.find(
          (p: SubscriptionPlan) =>
            p.planType === currentSubscription.planType &&
            p.billingCycle === currentSubscription.billingCycle,
        );

        const remainingValue = (currentPlan?.price ?? 0) * prorationRatio;
        const upgradeDifference = Math.max(0, plan.price - remainingValue);

        return initializePaystackTransaction({
          email: session.user.email,
          amount: Math.round(upgradeDifference * 100),
          school,
          planId: plan.id,
          planName: plan.name,
          paystackPlanCode: plan.paystackPlanCode,
          isUpgrade: true,
          schoolSlug,
        });
      }
    }

    // ── Normal new subscription ───────────────────────────────────────────────
    return initializePaystackTransaction({
      email: session.user.email,
      amount: Math.round(plan.price * 100),
      school,
      planId: plan.id,
      planName: plan.name,
      paystackPlanCode: plan.paystackPlanCode,
      isUpgrade: false,
      schoolSlug,
    });
  } catch (error) {
    console.error("[Initialize] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// HELPER — call Paystack transaction/initialize
// ============================================================================

async function initializePaystackTransaction({
  email,
  amount,
  school,
  planId,
  planName,
  paystackPlanCode,
  isUpgrade,
  schoolSlug,
  extraMetadata = {},
}: {
  email: string;
  amount: number;
  school: { id: string; name: string };
  planId: string | null;
  planName: string;
  paystackPlanCode?: string;
  isUpgrade: boolean;
  schoolSlug: string;
  extraMetadata?: Record<string, unknown>;
}) {
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  const payload: Record<string, unknown> = {
    email,
    amount,
    currency: "GHS",
    callback_url: `${appUrl}/api/schools/${schoolSlug}/subscription/verify`,
    metadata: {
      schoolId: school.id,
      planId,
      isUpgrade,
      ...extraMetadata,
      custom_fields: [
        {
          display_name: "School Name",
          variable_name: "school_name",
          value: school.name,
        },
        {
          display_name: "Plan Name",
          variable_name: "plan_name",
          value: planName,
        },
        {
          display_name: "Type",
          variable_name: "type",
          value:
            extraMetadata.type === "CARD_UPDATE"
              ? "Card Update"
              : isUpgrade
                ? "Upgrade"
                : "New Subscription",
        },
      ],
    },
  };

  // Attach Paystack plan code for new (non-upgrade, non-card-update) subscriptions.
  // For upgrades, the plan code is updated after the prorated payment via PUT.
  if (!isUpgrade && paystackPlanCode) {
    payload.plan = paystackPlanCode;
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
    const errorData = await response.json().catch(() => ({}));
    console.error("[Initialize] Paystack error:", errorData);
    return NextResponse.json(
      { error: "Payment initialization failed" },
      { status: 500 },
    );
  }

  const paystackData = await response.json();
  return NextResponse.json(paystackData.data);
}
