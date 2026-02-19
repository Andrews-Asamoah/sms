import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getPlanById, getPlanByCode } from "@/lib/subscription-plans";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error("[Paystack Webhook] PAYSTACK_SECRET_KEY is not defined");
      return NextResponse.json({ error: "Config error" }, { status: 500 });
    }

    // Verify signature
    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.error("[Paystack Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log(`[Paystack Webhook] Event received: ${event.event}`);

    switch (event.event) {
      case "charge.success":
      case "subscription.create":
        await handleSubscriptionSuccess(event.data);
        break;
      case "subscription.disable":
        await handleSubscriptionDisabled(event.data);
        break;
      // Add other events as needed
      default:
        console.log(`[Paystack Webhook] Unhandled event: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Paystack Webhook] Error processing webhook:", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 500 });
  }
}

async function handleSubscriptionSuccess(data: any) {
  const reference = data.reference;
  const metadata = data.metadata;
  const schoolId = metadata?.schoolId;
  const planId = metadata?.planId;
  const planCode = data.plan?.plan_code;

  console.log(
    `[Paystack Webhook] Processing success for schoolId: ${schoolId}, ref: ${reference}`,
  );

  if (!schoolId) {
    console.error(
      `[Paystack Webhook] No schoolId found in metadata for reference ${reference}`,
    );
    return;
  }

  // Try to find the plan
  let plan = planId ? getPlanById(planId) : null;
  if (!plan && planCode) {
    plan = getPlanByCode(planCode);
  }

  if (!plan) {
    console.warn(
      `[Paystack Webhook] Plan not found for ID: ${planId} or Code: ${planCode}`,
    );
  }

  const currentDate = new Date();
  const expiryDate = new Date();
  if (plan?.billingCycle === "YEARLY") {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  }

  // Upsert subscription
  const subscription = await prisma.subscription.upsert({
    where: { schoolId },
    create: {
      schoolId,
      planType: plan?.planType || "PREMIUM",
      planName: plan?.name || "Premium Plan",
      billingCycle: plan?.billingCycle || "MONTHLY",
      status: "ACTIVE",
      amount: plan?.price || data.amount / 100,
      currency: plan?.currency || data.currency,
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
    },
    update: {
      planType: plan?.planType || "PREMIUM",
      planName: plan?.name || "Premium Plan",
      billingCycle: plan?.billingCycle || "MONTHLY",
      status: "ACTIVE",
      amount: plan?.price || data.amount / 100,
      currency: plan?.currency || data.currency,
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
    },
  });

  // Create invoice
  await prisma.invoiceRecord.create({
    data: {
      subscriptionId: subscription.id,
      invoiceNumber: `INV-${Date.now()}-${reference || "WH"}`,
      amount: plan?.price || data.amount / 100,
      currency: plan?.currency || data.currency,
      status: "PAID",
      periodStart: currentDate,
      periodEnd: expiryDate,
      paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
      paymentMethod: data.channel || "webhook",
    },
  });

  console.log(
    `[Paystack Webhook] ✅ Subscription and invoice updated for school: ${schoolId}`,
  );
}

async function handleSubscriptionDisabled(data: any) {
  const customerCode = data.customer?.customer_code;
  const subscriptionCode = data.subscription_code;

  console.log(`[Paystack Webhook] Disabling subscription: ${subscriptionCode}`);

  if (!subscriptionCode) return;

  await prisma.subscription.updateMany({
    where: { paystackSubscriptionCode: subscriptionCode },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
    },
  });

  console.log(
    `[Paystack Webhook] ✅ Subscription marked as CANCELED: ${subscriptionCode}`,
  );
}
