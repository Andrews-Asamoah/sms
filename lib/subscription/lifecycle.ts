import prisma from "@/lib/prisma";
// Removed enum import to avoid runtime issues in Next.js Turbopack/Browser
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "EXPIRED" | "INCOMPLETE";

export interface SubscriptionLifecycleStatus {
  status: SubscriptionStatus;
  daysRemaining: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  currentPeriodEnd: Date | null;
  planName: string;
  planType: string;
}

/**
 * Checks and updates the subscription status based on current dates.
 * This should be called in layout data fetching to ensure real-time enforcement.
 */
export async function checkSubscriptionStatus(schoolId: string): Promise<SubscriptionLifecycleStatus | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { schoolId },
  });

  if (!subscription) return null;

  const now = new Date();
  const currentPeriodEnd = subscription.currentPeriodEnd;
  const trialEndsAt = subscription.trialEndsAt;
  let currentStatus = subscription.status;
  let isExpired = currentStatus === "EXPIRED";

  // 1. Handle Trial Expiry
  if (
    subscription.isOnTrial &&
    trialEndsAt &&
    trialEndsAt < now &&
    currentStatus === "TRIALING"
  ) {
    try {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "EXPIRED" as any, isOnTrial: false },
      });
      currentStatus = "EXPIRED" as any;
      isExpired = true;
    } catch (e) {
      console.error("Failed to update status to EXPIRED (trial) in DB", e);
      // Still treat as expired in memory for the UI
      isExpired = true;
    }
  }

  // 2. Handle Subscription Expiry (Current Period End)
  if (
    !isExpired &&
    currentPeriodEnd &&
    currentPeriodEnd < now &&
    (currentStatus === "ACTIVE" || currentStatus === "PAST_DUE")
  ) {
    try {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "EXPIRED" as any },
      });
      currentStatus = "EXPIRED" as any;
      isExpired = true;
    } catch (e) {
      console.error("Failed to update status to EXPIRED (period) in DB", e);
      // Still treat as expired in memory for the UI
      isExpired = true;
    }
  }

  // 3. Calculate metrics
  const targetDate = isExpired ? null : (currentStatus === ("TRIALING" as any) ? trialEndsAt : currentPeriodEnd);
  const daysRemaining = targetDate
    ? Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

  return {
    status: currentStatus as any,
    daysRemaining,
    isExpired,
    isExpiringSoon,
    currentPeriodEnd: currentPeriodEnd,
    planName: subscription.planName,
    planType: subscription.planType,
  };
}
