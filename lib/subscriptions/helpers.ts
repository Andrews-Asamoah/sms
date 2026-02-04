// lib/subscriptions/helpers.ts
import { SubscriptionStatus, PlanType } from "@/lib/generated/prisma/client";
import { SUBSCRIPTION_PLANS } from "./plans";

export function isSubscriptionActive(
  status: SubscriptionStatus | null,
): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}

export function isSubscriptionExpired(
  status: SubscriptionStatus | null,
  currentPeriodEnd: Date | null,
): boolean {
  if (!currentPeriodEnd) return false;
  return (
    new Date() > currentPeriodEnd &&
    (status === "PAST_DUE" || status === "CANCELED" || status === "UNPAID")
  );
}

export function getDaysUntilExpiry(currentPeriodEnd: Date | null): number {
  if (!currentPeriodEnd) return 0;
  const now = new Date();
  const diff = currentPeriodEnd.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getDaysRemainingInTrial(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const diff = trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function formatPrice(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function getSubscriptionStatusColor(status: SubscriptionStatus): string {
  const colors: Record<SubscriptionStatus, string> = {
    ACTIVE: "text-green-600 bg-green-100 dark:bg-green-900/20",
    TRIALING: "text-blue-600 bg-blue-100 dark:bg-blue-900/20",
    PAST_DUE: "text-orange-600 bg-orange-100 dark:bg-orange-900/20",
    CANCELED: "text-red-600 bg-red-100 dark:bg-red-900/20",
    INCOMPLETE: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20",
    INCOMPLETE_EXPIRED: "text-gray-600 bg-gray-100 dark:bg-gray-900/20",
    UNPAID: "text-red-600 bg-red-100 dark:bg-red-900/20",
  };
  return colors[status] || "text-gray-600 bg-gray-100";
}

export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    ACTIVE: "Active",
    TRIALING: "Trial",
    PAST_DUE: "Past Due",
    CANCELED: "Canceled",
    INCOMPLETE: "Incomplete",
    INCOMPLETE_EXPIRED: "Expired",
    UNPAID: "Unpaid",
  };
  return labels[status] || status;
}

export function canUpgradePlan(
  currentPlan: PlanType,
  targetPlan: PlanType,
): boolean {
  const planOrder: PlanType[] = ["FREE", "PREMIUM", "ENTERPRISE"];
  const currentIndex = planOrder.indexOf(currentPlan);
  const targetIndex = planOrder.indexOf(targetPlan);
  return targetIndex > currentIndex;
}

export function canDowngradePlan(
  currentPlan: PlanType,
  targetPlan: PlanType,
): boolean {
  const planOrder: PlanType[] = ["FREE", "PREMIUM", "ENTERPRISE"];
  const currentIndex = planOrder.indexOf(currentPlan);
  const targetIndex = planOrder.indexOf(targetPlan);
  return targetIndex < currentIndex;
}

export function isWithinLimits(
  planType: PlanType,
  counts: { students: number; teachers: number; staff: number },
): boolean {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planType);
  if (!plan) return false;

  if (plan.limits.students !== null && counts.students > plan.limits.students) {
    return false;
  }
  if (plan.limits.teachers !== null && counts.teachers > plan.limits.teachers) {
    return false;
  }
  if (plan.limits.staff !== null && counts.staff > plan.limits.staff) {
    return false;
  }

  return true;
}

export function getUsagePercentage(
  current: number,
  limit: number | null,
): number {
  if (limit === null) return 0; // Unlimited
  return Math.min(100, (current / limit) * 100);
}
