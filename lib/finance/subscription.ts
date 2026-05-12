// lib/finance/subscription.ts
import prisma from "@/lib/prisma";
import { SubscriptionStatus, PlanType } from "@prisma/client";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";

export type ResourceQuotaType = "maxStudents" | "maxTeachers" | "maxStaff";

export async function checkQuotaInfo(
  schoolId: string,
  resourceType: ResourceQuotaType,
) {
  const subscription = await prisma.subscription.findUnique({
    where: { schoolId },
  });

  const planType = subscription?.planType || PlanType.FREE;
  const currentPlan =
    SUBSCRIPTION_PLANS.find(
      (p) => p.planType === planType && p.billingCycle === "MONTHLY",
    ) || SUBSCRIPTION_PLANS[0];

  // Custom limits defined directly on the subscription take precedence,
  // falling back to the predefined limits from the standard plans.
  let planLimitValue = null;
  if (resourceType === "maxStudents")
    planLimitValue = currentPlan.limits.students;
  if (resourceType === "maxTeachers")
    planLimitValue = currentPlan.limits.teachers;
  if (resourceType === "maxStaff") planLimitValue = currentPlan.limits.staff;

  const limitValue = subscription?.[resourceType] ?? planLimitValue;

  let currentCount = 0;

  switch (resourceType) {
    case "maxStudents":
      currentCount = await prisma.student.count({
        where: { schoolId, status: "ACTIVE" },
      });
      break;
    case "maxTeachers":
      currentCount = await prisma.teacher.count({
        where: { schoolId, isActive: true },
      });
      break;
    case "maxStaff":
      currentCount = await prisma.staff.count({
        where: { schoolId, isActive: true },
      });
      break;
  }

  return {
    currentCount,
    limit: limitValue,
    hasReachedQuota: limitValue !== null && currentCount >= limitValue,
    allowedLeft:
      limitValue === null ? null : Math.max(0, limitValue - currentCount),
  };
}

export async function enforceQuota(
  schoolId: string,
  resourceType: ResourceQuotaType,
) {
  const quotaInfo = await checkQuotaInfo(schoolId, resourceType);

  if (quotaInfo.hasReachedQuota) {
    throw new Error(
      `Quota exceeded: Your current plan only allows up to ${quotaInfo.limit} ${resourceType.replace("max", "")}. Please upgrade your plan.`,
    );
  }

  return true;
}

/**
 * Initializes a subscription for a school.
 * Should ideally be called when a school is first created.
 */
export async function initializeSchoolSubscription(schoolId: string) {
  const existing = await prisma.subscription.findUnique({
    where: { schoolId },
  });

  if (existing) return existing;

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14); // 14-day trial period

  const freePlan =
    SUBSCRIPTION_PLANS.find((p) => p.id === "FREE") || SUBSCRIPTION_PLANS[0];

  return await prisma.subscription.create({
    data: {
      schoolId: schoolId,
      planType: PlanType.FREE,
      planName: freePlan.name,
      status: SubscriptionStatus.TRIALING,
      amount: 0,
      isOnTrial: true,
      trialStartsAt: new Date(),
      trialEndsAt: trialEnds,
      maxStudents: freePlan.limits.students,
      maxTeachers: freePlan.limits.teachers,
      maxStaff: freePlan.limits.staff,
    },
  });
}
