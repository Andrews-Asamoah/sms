import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getPlanById, getPlanByCode } from "@/lib/subscription-plans";
import { processSequentialPayment } from "@/lib/finance/payment-processor";

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
        await handleChargeSuccess(event.data);
        break;
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

async function handleChargeSuccess(data: any) {
  const metadata = data.metadata;
  if (metadata?.type === "student_fee") {
    console.log(`[Paystack Webhook] Processing individual fee payment: Ref ${data.reference}`);
    try {
      if (!metadata.schoolId || !metadata.studentId || !metadata.billId) {
        throw new Error("Missing required metadata for fee payment");
      }
      
      await processSequentialPayment({
        schoolId: metadata.schoolId,
        studentId: metadata.studentId,
        billId: metadata.billId,
        amount: data.amount / 100,
        reference: data.reference,
        paymentMethod: "ONLINE",
      });
      console.log(`[Paystack Webhook] Successfully processed fee payment: Ref ${data.reference}`);
    } catch (err) {
      console.error(`[Paystack Webhook] Error processing fee payment:`, err);
    }
  } else {
    // Treat as subscription
    await handleSubscriptionSuccess(data);
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

  // Fetch school to get organizationId
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { organizationId: true }
  });

  if (!school) return;

  // ── Invoice lifecycle: transition PENDING → PAID or create new ──────────
  //
  // The cron job pre-generates a PENDING invoice 7 days before expiry.
  // When the school pays, we must update that record rather than create a
  // duplicate. If no pending invoice exists (e.g. first-time subscriber or
  // the cron hasn't run yet), we create a new PAID invoice as usual.
  //
  const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
  const invoiceAmount = plan?.price || data.amount / 100;
  const invoiceCurrency = plan?.currency || data.currency;

  const pendingInvoice = await prisma.invoiceRecord.findFirst({
    where: { subscriptionId: subscription.id, status: "PENDING" },
    select: { id: true },
  });

  if (pendingInvoice) {
    await prisma.invoiceRecord.update({
      where: { id: pendingInvoice.id },
      data: {
        status: "PAID",
        amount: invoiceAmount,
        currency: invoiceCurrency,
        periodStart: currentDate,
        periodEnd: expiryDate,
        paidAt,
        paymentMethod: data.channel || "webhook",
      },
    });
  } else {
    await prisma.invoiceRecord
      .create({
        data: {
          subscriptionId: subscription.id,
          invoiceNumber: `INV-${Date.now()}-${reference || "WH"}`,
          amount: invoiceAmount,
          currency: invoiceCurrency,
          status: "PAID",
          periodStart: currentDate,
          periodEnd: expiryDate,
          paidAt,
          paymentMethod: data.channel || "webhook",
        },
      })
      .catch((e: any) => {
        // P2002 = unique constraint on invoiceNumber — already created by the
        // verify callback. Safe to ignore.
        if (e?.code === "P2002") return;
        console.error("[Webhook] Failed to create invoice:", e);
      });
  }

  // Sync to organization for global middleware checks
  await prisma.organization.update({
    where: { id: school.organizationId },
    data: {
      subscriptionStatus: "ACTIVE",
      expiresAt: expiryDate,
    },
  });

  console.log(
    `[Paystack Webhook] ✅ Subscription, invoice, and organization status updated for school: ${schoolId}`,
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

  // Sync to organization
  const sub = await prisma.subscription.findFirst({
    where: { paystackSubscriptionCode: subscriptionCode },
    select: { school: { select: { organizationId: true } } }
  });

  if (sub?.school?.organizationId) {
    await prisma.organization.update({
      where: { id: sub.school.organizationId },
      data: { subscriptionStatus: "CANCELED" }
    });
  }

  console.log(
    `[Paystack Webhook] ✅ Subscription and organization marked as CANCELED: ${subscriptionCode}`,
  );
}
