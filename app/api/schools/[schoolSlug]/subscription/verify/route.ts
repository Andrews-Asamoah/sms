// app/api/schools/[schoolSlug]/subscription/verify/route.ts
//
// Handles the Paystack redirect callback after a payment completes.
// The GET handler is called by Paystack redirecting the user back to our app.
// The POST handler has been removed — it duplicated webhook logic and caused
// double-invoicing when the webhook had already processed the payment.
// All payment processing is handled by the Paystack webhook at /api/webhooks/paystack.

import { NextRequest, NextResponse } from "next/server";
import { verifyApiSchoolAccess } from "@/lib/auth/guards";
import prisma from "@/lib/prisma";
import { getPlanById } from "@/lib/subscription-plans";

type RouteContext = {
  params: Promise<{ schoolSlug: string }>;
};

// ============================================================================
// GET — Paystack redirect callback
// ============================================================================

export async function GET(request: NextRequest, context: RouteContext) {
  const { schoolSlug } = await context.params;

  try {
    const access = await verifyApiSchoolAccess(schoolSlug, ["owner", "admin"]);
    if (!access.authorized) {
      if (access.errorResponse.status === 401) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
      return NextResponse.redirect(
        new URL(
          `/${schoolSlug}/admin/subscription?error=unauthorized`,
          request.url,
        ),
      );
    }
    const { session } = access;

    const { searchParams } = new URL(request.url);
    const reference =
      searchParams.get("reference") ?? searchParams.get("trxref");

    if (!reference) {
      return NextResponse.redirect(
        new URL(
          `/${schoolSlug}/admin/subscription?error=missing_reference`,
          request.url,
        ),
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error("[Verify] PAYSTACK_SECRET_KEY is not set");
      return NextResponse.redirect(
        new URL(`/${schoolSlug}/admin/subscription?error=config`, request.url),
      );
    }

    // ── Verify transaction with Paystack ──────────────────────────────────────
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
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

    const { data } = await verifyResponse.json();

    if (data.status !== "success") {
      console.error(
        `[Verify] Payment not successful for ${reference}: ${data.status}`,
      );
      return NextResponse.redirect(
        new URL(
          `/${schoolSlug}/admin/subscription?error=payment_failed&status=${data.status}`,
          request.url,
        ),
      );
    }

    const metaSchoolId = data.metadata?.schoolId;
    const metaPlanId = data.metadata?.planId;
    const isUpgrade = data.metadata?.isUpgrade === true;
    const isCardUpdate = data.metadata?.type === "CARD_UPDATE";

    if (!metaSchoolId) {
      console.error(
        `[Verify] Missing schoolId in metadata for reference ${reference}`,
      );
      return NextResponse.redirect(
        new URL(
          `/${schoolSlug}/admin/subscription?error=invalid_metadata`,
          request.url,
        ),
      );
    }

    // Verify school ID matches school slug to prevent cross-tenant verification exploits
    const schoolFromSlug = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!schoolFromSlug || schoolFromSlug.id !== metaSchoolId) {
      console.error(
        `[Verify] School mismatch: school associated with slug "${schoolSlug}" has ID "${schoolFromSlug?.id}", but transaction metadata has ID "${metaSchoolId}"`
      );
      return NextResponse.redirect(
        new URL(
          `/${schoolSlug}/admin/subscription?error=school_mismatch`,
          request.url,
        ),
      );
    }

    // ── Card update flow ──────────────────────────────────────────────────────
    if (isCardUpdate) {
      // Store the new authorization code so future charges use the new card.
      const existing = await prisma.subscription.findUnique({
        where: { schoolId: metaSchoolId },
        select: { settings: true },
      });

      await prisma.subscription.update({
        where: { schoolId: metaSchoolId },
        data: {
          paystackTransactionId: String(data.id),
          paystackCustomerCode: data.customer?.customer_code,
          paystackEmail: data.customer?.email,
          settings: {
            ...((existing?.settings as Record<string, unknown>) ?? {}),
            authCode: data.authorization?.authorization_code,
          },
        },
      });

      return NextResponse.redirect(
        new URL(
          `/${schoolSlug}/admin/subscription?success=card_updated`,
          request.url,
        ),
      );
    }

    // ── Subscription payment flow ─────────────────────────────────────────────
    //
    // NOTE: The Paystack webhook (POST /api/webhooks/paystack) is the primary
    // handler for subscription creation and renewal. This GET callback is a
    // fallback for cases where the webhook hasn't fired yet when the user lands
    // back on the subscription page (race condition on slow webhook delivery).
    // Both paths are idempotent — upsert ensures no duplicate records.
    //
    const plan = metaPlanId ? getPlanById(metaPlanId) : null;
    if (!plan) {
      console.warn(
        `[Verify] Plan not found for ID: ${metaPlanId} — using defaults`,
      );
    }

    const currentDate = new Date();
    const expiryDate = new Date();
    if (plan?.billingCycle === "YEARLY") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    // For upgrades, update the Paystack subscription plan so future recurring
    // charges use the new plan amount.
    if (isUpgrade && data.subscription_code && plan?.paystackPlanCode) {
      try {
        await fetch(
          `https://api.paystack.co/subscription/${data.subscription_code}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ plan: plan.paystackPlanCode }),
          },
        );
      } catch (err) {
        console.error(
          "[Verify] Failed to update Paystack subscription plan:",
          err,
        );
      }
    }

    // Hoist the upgradeFrom lookup outside the upsert to avoid a DB query
    // inside Prisma's eagerly-evaluated create/update object.
    let upgradeFromPlanType: string | null = null;
    if (isUpgrade) {
      const existing = await prisma.subscription.findUnique({
        where: { schoolId: metaSchoolId },
        select: { planType: true },
      });
      upgradeFromPlanType = existing?.planType ?? null;
    }

    const subscription = await prisma.subscription.upsert({
      where: { schoolId: metaSchoolId },
      create: {
        schoolId: metaSchoolId,
        planType: plan?.planType ?? "PREMIUM",
        planName: plan?.name ?? "Premium Plan",
        billingCycle: plan?.billingCycle ?? "MONTHLY",
        status: "ACTIVE",
        amount: plan?.price ?? 99.0,
        currency: plan?.currency ?? "GHS",
        currentPeriodStart: currentDate,
        currentPeriodEnd: expiryDate,
        isOnTrial: false,
        paystackTransactionId: String(data.id),
        paystackCustomerCode: data.customer?.customer_code,
        paystackEmail: data.customer?.email,
        paystackSubscriptionCode: data.subscription_code,
        maxStudents: plan?.limits.students ?? null,
        maxTeachers: plan?.limits.teachers ?? null,
        maxStaff: plan?.limits.staff ?? null,
        settings: isUpgrade ? { upgradeFrom: upgradeFromPlanType } : undefined,
      },
      update: {
        planType: plan?.planType ?? "PREMIUM",
        planName: plan?.name ?? "Premium Plan",
        billingCycle: plan?.billingCycle ?? "MONTHLY",
        status: "ACTIVE",
        amount: plan?.price ?? 99.0,
        currency: plan?.currency ?? "GHS",
        currentPeriodStart: currentDate,
        currentPeriodEnd: expiryDate,
        isOnTrial: false,
        paystackTransactionId: String(data.id),
        paystackCustomerCode: data.customer?.customer_code,
        paystackEmail: data.customer?.email,
        paystackSubscriptionCode: data.subscription_code,
        maxStudents: plan?.limits.students ?? null,
        maxTeachers: plan?.limits.teachers ?? null,
        maxStaff: plan?.limits.staff ?? null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        settings: {
          switchType: null,
          pendingPlanId: null,
          ...(isUpgrade ? { upgradeFrom: upgradeFromPlanType } : {}),
        },
      },
    });

    // Mark pending invoice as PAID or create a new invoice record
    const pendingInvoice = await prisma.invoiceRecord.findFirst({
      where: {
        subscriptionId: subscription.id,
        status: "PENDING",
      },
    });

    if (pendingInvoice) {
      await prisma.invoiceRecord.update({
        where: { id: pendingInvoice.id },
        data: {
          status: "PAID",
          paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
          paymentMethod: data.channel ?? "card",
          periodStart: currentDate,
          periodEnd: expiryDate,
        },
      }).catch((e) => {
        console.error("[Verify] Failed to update pending invoice to PAID:", e);
      });
    } else {
      await prisma.invoiceRecord
        .create({
          data: {
            subscriptionId: subscription.id,
            invoiceNumber: `INV-${reference}`,
            amount: plan?.price ?? 99.0,
            currency: plan?.currency ?? "GHS",
            status: "PAID",
            periodStart: currentDate,
            periodEnd: expiryDate,
            paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
            paymentMethod: data.channel ?? "card",
          },
        })
        .catch((e) => {
          // Unique constraint on invoiceNumber — invoice already created by
          // the webhook. This is expected and safe to ignore.
          if (e?.code === "P2002") return;
          console.error("[Verify] Failed to create invoice:", e);
        });
    }

    // Sync organization status.
    const school = await prisma.school.findUnique({
      where: { id: metaSchoolId },
      select: { organizationId: true },
    });

    if (school?.organizationId) {
      await prisma.organization.update({
        where: { id: school.organizationId },
        data: {
          subscriptionStatus: "ACTIVE",
          expiresAt: expiryDate,
        },
      });
    }

    return NextResponse.redirect(
      new URL(`/${schoolSlug}/admin/subscription?success=true`, request.url),
    );
  } catch (error) {
    console.error("[Verify] Error:", error);
    return NextResponse.redirect(
      new URL(`/${schoolSlug}/admin/subscription?error=internal`, request.url),
    );
  }
}
