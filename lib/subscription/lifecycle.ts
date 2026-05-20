// lib/subscription/lifecycle.ts

import prisma from "@/lib/prisma";
import type { SubscriptionStatus as PrismaSubscriptionStatus } from "@prisma/client";

// ── Internal helper ───────────────────────────────────────────────────────────
// Syncs organization.subscriptionStatus after a lazy EXPIRED write so the proxy
// cookie cache (which reads that field) immediately reflects the new state.
async function syncOrgStatusExpired(subscriptionId: string): Promise<void> {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { school: { select: { organizationId: true } } },
    });
    if (!sub?.school?.organizationId) return;
    await prisma.organization.update({
      where: { id: sub.school.organizationId },
      data: { subscriptionStatus: "EXPIRED" },
    });
  } catch (e) {
    console.error("[Subscription] Failed to sync org status to EXPIRED:", e);
  }
}

// ============================================================================
// TYPES
// ============================================================================

// Defined as a plain union (not importing the Prisma enum) so client
// components can import this type without pulling in the server-only
// Prisma client into the browser bundle.
export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "INCOMPLETE"
  | "INCOMPLETE_EXPIRED"
  | "UNPAID"
  | "EXPIRED"
  | "SUSPENDED";

export interface SubscriptionLifecycleStatus {
  /** Resolved effective status after expiry checks. */
  status: SubscriptionStatus;
  /** Days until expiry, or null if already expired. */
  daysRemaining: number | null;
  /** True when status resolved to EXPIRED. */
  isExpired: boolean;
  /** True when fewer than 7 days remain. */
  isExpiringSoon: boolean;
  /** Relevant end date — trial end or billing period end. */
  currentPeriodEnd: Date | null;
  planName: string;
  planType: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Resolves the effective subscription status for a school.
 *
 * Called in layout data fetching on every page load — must be fast and safe.
 * Lazily writes a status transition to the DB only when an actual expiry is
 * detected (trial ended, billing period ended). This keeps the DB in sync
 * without requiring a background job or cron.
 *
 * Returns null if the school has no subscription record.
 */
export async function checkSubscriptionStatus(
  schoolId: string,
): Promise<SubscriptionLifecycleStatus | null> {
  // Select only the fields we need — this runs on every layout load.
  const subscription = await prisma.subscription.findUnique({
    where: { schoolId },
    select: {
      id: true,
      status: true,
      planName: true,
      planType: true,
      isOnTrial: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
    },
  });

  if (!subscription) return null;

  const now = new Date();
  let effectiveStatus: SubscriptionStatus =
    subscription.status as SubscriptionStatus;
  let isExpired = effectiveStatus === "EXPIRED";

  // ── 1. Trial expiry ────────────────────────────────────────────────────────
  //
  // Transition TRIALING → EXPIRED when the trial end date has passed.
  // The lazy write fires once — the next call finds status already "EXPIRED".
  //
  if (
    !isExpired &&
    subscription.isOnTrial &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt < now &&
    effectiveStatus === "TRIALING"
  ) {
    effectiveStatus = "EXPIRED";
    isExpired = true;

    // Non-fatal write — in-memory status is already correct if this fails.
    // The next request will retry.
    await prisma.subscription
      .update({
        where: { id: subscription.id },
        data: {
          status: "EXPIRED" as PrismaSubscriptionStatus,
          isOnTrial: false,
        },
      })
      .then(() => syncOrgStatusExpired(subscription.id))
      .catch((e) => {
        console.error("[Subscription] Failed to persist EXPIRED (trial):", e);
      });
  }

  // ── 2. Billing period expiry ───────────────────────────────────────────────
  //
  // Transition ACTIVE/PAST_DUE → EXPIRED when the billing period has ended.
  // Paystack's webhook (subscription.disable) normally handles this, but this
  // is a safety net for missed or delayed webhooks.
  //
  if (
    !isExpired &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd < now &&
    (effectiveStatus === "ACTIVE" || effectiveStatus === "PAST_DUE")
  ) {
    effectiveStatus = "EXPIRED";
    isExpired = true;

    await prisma.subscription
      .update({
        where: { id: subscription.id },
        data: { status: "EXPIRED" as PrismaSubscriptionStatus },
      })
      .then(() => syncOrgStatusExpired(subscription.id))
      .catch((e) => {
        console.error("[Subscription] Failed to persist EXPIRED (period):", e);
      });
  }

  // ── 3. Derive metrics ──────────────────────────────────────────────────────

  // Use trial end date when on trial, billing period end otherwise.
  const endDate = isExpired
    ? null
    : effectiveStatus === "TRIALING"
      ? subscription.trialEndsAt
      : subscription.currentPeriodEnd;

  const daysRemaining = endDate != null ? daysUntil(endDate, now) : null;

  const isExpiringSoon =
    daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

  return {
    status: effectiveStatus,
    daysRemaining,
    isExpired,
    isExpiringSoon,
    currentPeriodEnd: subscription.currentPeriodEnd ?? null,
    planName: subscription.planName,
    planType: subscription.planType,
  };
}
