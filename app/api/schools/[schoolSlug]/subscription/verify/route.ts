import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { getPlanById } from "@/lib/subscription-plans";

type RouteContext = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

// GET handler for Paystack redirect callback
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const reference =
      searchParams.get("reference") || searchParams.get("trxref");
    const { schoolSlug } = await context.params;

    if (!reference) {
      return NextResponse.redirect(
        new URL(
          `/${schoolSlug}/admin/subscription?error=missing_reference`,
          request.url,
        ),
      );
    }

    // Verify with Paystack
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.redirect(
        new URL(`/${schoolSlug}/admin/subscription?error=config`, request.url),
      );
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${paystackSecretKey}` },
      },
    );

    if (!verifyResponse.ok) {
      return NextResponse.redirect(
        new URL(
          `/${schoolSlug}/admin/subscription?error=verification_failed`,
          request.url,
        ),
      );
    }

    const verifyData = await verifyResponse.json();
    const data = verifyData.data;

    console.log(
      `[Paystack Verify] Verification result for ${reference}:`,
      data.status,
    );

    if (data.status !== "success") {
      console.error(
        `[Paystack Verify] ❌ Payment not successful for ${reference}. Status: ${data.status}`,
      );
      return NextResponse.redirect(
        new URL(
          `/${schoolSlug}/admin/subscription?error=payment_failed&status=${data.status}`,
          request.url,
        ),
      );
    }

    // Extract Metadata
    const metaSchoolId = data.metadata?.schoolId;
    const metaPlanId = data.metadata?.planId;
    const isUpgrade = data.metadata?.isUpgrade === true;

    console.log(
      `[Paystack Verify] Metadata: schoolId=${metaSchoolId}, planId=${metaPlanId}, isUpgrade=${isUpgrade}`,
    );

    if (!metaSchoolId) {
      console.error(
        `[Paystack Verify] ❌ Missing schoolId in metadata for reference ${reference}`,
      );
      return NextResponse.redirect(
        new URL(
          `/${schoolSlug}/admin/subscription?error=invalid_metadata`,
          request.url,
        ),
      );
    }

    const plan = metaPlanId ? getPlanById(metaPlanId) : null;
    if (!plan) {
      console.warn(
        `[Paystack Verify] ⚠️ Plan not found for ID: ${metaPlanId}. Using defaults.`,
      );
    }

    // Update subscription
    const currentDate = new Date();
    const expiryDate = new Date();
    if (plan?.billingCycle === "YEARLY") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    console.log(
      `[Paystack Verify] 🔄 Updating subscription for schoolId: ${metaSchoolId}`,
    );

    // If it's an upgrade, we should also try to update the Paystack subscription plan for future charges
    if (isUpgrade && data.subscription_code && plan?.paystackPlanCode) {
      console.log(
        `[Paystack Verify] 🚀 Upgrading Paystack subscription ${data.subscription_code} to plan ${plan.paystackPlanCode}`,
      );
      try {
        await fetch(
          `https://api.paystack.co/subscription/${data.subscription_code}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              plan: plan.paystackPlanCode,
            }),
          },
        );
      } catch (err) {
        console.error(
          "[Paystack Verify] Failed to update Paystack subscription plan:",
          err,
        );
      }
    }

    const subscription = await prisma.subscription.upsert({
      where: { schoolId: metaSchoolId },
      create: {
        schoolId: metaSchoolId,
        planType: plan?.planType || "PREMIUM",
        planName: plan?.name || "Premium Plan",
        billingCycle: plan?.billingCycle || "MONTHLY",
        status: "ACTIVE",
        amount: plan?.price || 99.0,
        currency: plan?.currency || "GHS",
        currentPeriodStart: currentDate,
        currentPeriodEnd: expiryDate,
        isOnTrial: false,
        paystackTransactionId: String(data.id),
        paystackCustomerCode: data.customer?.customer_code,
        paystackEmail: data.customer?.email,
        paystackSubscriptionCode: data.subscription_code,
        maxStudents: plan?.limits.students,
        maxTeachers: plan?.limits.teachers,
        maxStaff: plan?.limits.staff,
        settings: isUpgrade
          ? {
              upgradeFrom: (
                await prisma.subscription.findUnique({
                  where: { schoolId: metaSchoolId },
                })
              )?.planType,
            }
          : undefined,
      },
      update: {
        planType: plan?.planType || "PREMIUM",
        planName: plan?.name || "Premium Plan",
        billingCycle: plan?.billingCycle || "MONTHLY",
        status: "ACTIVE",
        amount: plan?.price || 99.0,
        currency: plan?.currency || "GHS",
        // For upgrades, we might keep the current period or extend it.
        // Here we extend it as they paid for a new full period (or prorated).
        currentPeriodStart: currentDate,
        currentPeriodEnd: expiryDate,
        isOnTrial: false,
        paystackTransactionId: String(data.id),
        paystackCustomerCode: data.customer?.customer_code,
        paystackEmail: data.customer?.email,
        paystackSubscriptionCode: data.subscription_code,
        maxStudents: plan?.limits.students,
        maxTeachers: plan?.limits.teachers,
        maxStaff: plan?.limits.staff,
        cancelAtPeriodEnd: false, // Reset cancellation if they upgraded
        settings: {
          switchType: null,
          pendingPlanId: null,
        },
      },
    });

    console.log(
      `[Paystack Verify] ✅ Subscription updated: ${subscription.id}`,
    );

    // Create invoice
    await prisma.invoiceRecord.create({
      data: {
        subscriptionId: subscription.id,
        invoiceNumber: `INV-${Date.now()}`,
        amount: plan?.price || 99.0,
        currency: plan?.currency || "GHS",
        status: "PAID",
        periodStart: currentDate,
        periodEnd: expiryDate,
        paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
        paymentMethod: data.channel || "card",
      },
    });

    console.log(`[Paystack Verify] 📄 Invoice created`);

    // Redirect to school dashboard or subscription page
    // Using schoolSlug to ensure they land back in the right place
    const redirectUrl = new URL(
      `/${schoolSlug}/admin/subscription?success=true`,
      request.url,
    );

    console.log(
      `[Paystack Verify] ➡️ Redirecting to: ${redirectUrl.toString()}`,
    );
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in Paystack callback:", error);
    const { schoolSlug } = await context.params;
    return NextResponse.redirect(
      new URL(`/${schoolSlug}/admin/subscription?error=internal`, request.url),
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    // 1. Verify Transaction with Paystack
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: "Configuration error" },
        { status: 500 },
      );
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      },
    );

    if (!verifyResponse.ok) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 },
      );
    }

    const verifyData = await verifyResponse.json();
    const data = verifyData.data;

    if (data.status !== "success") {
      return NextResponse.json(
        { error: "Transaction not successful" },
        { status: 400 },
      );
    }

    // 2. Extract Metadata
    const schoolId = data.metadata?.schoolId;
    const planId = data.metadata?.planId;

    if (!schoolId) {
      return NextResponse.json(
        { error: "Invalid transaction metadata" },
        { status: 400 },
      );
    }

    const plan = planId ? getPlanById(planId) : null;

    // 3. Update Subscription
    const currentDate = new Date();
    const expiryDate = new Date();
    if (plan?.billingCycle === "YEARLY") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const subscription = await prisma.subscription.upsert({
      where: { schoolId },
      create: {
        schoolId,
        planType: plan?.planType || "PREMIUM",
        planName: plan?.name || "Premium Plan",
        billingCycle: plan?.billingCycle || "MONTHLY",
        status: "ACTIVE",
        amount: plan?.price || 99.0,
        currency: plan?.currency || "GHS",
        currentPeriodStart: currentDate,
        currentPeriodEnd: expiryDate,
        isOnTrial: false,
        trialStartsAt: null,
        trialEndsAt: null,
        paystackTransactionId: String(data.id),
        paystackCustomerCode: data.customer.customer_code,
        paystackEmail: data.customer.email,
        paystackSubscriptionCode: data.subscription_code,
        maxStudents: plan?.limits.students,
        maxTeachers: plan?.limits.teachers,
        maxStaff: plan?.limits.staff,
      },
      update: {
        planType: plan?.planType || "PREMIUM",
        planName: plan?.name || "Premium Plan",
        billingCycle: plan?.billingCycle || "MONTHLY",
        status: "ACTIVE",
        amount: plan?.price || 99.0,
        currency: plan?.currency || "GHS",
        currentPeriodStart: currentDate,
        currentPeriodEnd: expiryDate,
        isOnTrial: false,
        trialStartsAt: null,
        trialEndsAt: null,
        paystackTransactionId: String(data.id),
        paystackCustomerCode: data.customer.customer_code,
        paystackEmail: data.customer.email,
        paystackSubscriptionCode: data.subscription_code,
        maxStudents: plan?.limits.students,
        maxTeachers: plan?.limits.teachers,
        maxStaff: plan?.limits.staff,
      },
    });

    // 4. Create Invoice Record
    await prisma.invoiceRecord.create({
      data: {
        subscriptionId: subscription.id,
        invoiceNumber: `INV-${Date.now()}`,
        amount: plan?.price || 99.0,
        currency: plan?.currency || "GHS",
        status: "PAID",
        periodStart: currentDate,
        periodEnd: expiryDate,
        paidAt: new Date(data.paid_at),
        paymentMethod: data.channel,
        invoiceUrl: null,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error("Error verifying subscription:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
