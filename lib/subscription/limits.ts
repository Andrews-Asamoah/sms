// lib/subscription/limits.ts
//
// Single source of truth for subscription limit resolution.
//
// The DB stores `null` in maxStudents / maxTeachers / maxStaff to mean
// "unlimited". A missing subscription means the school is on the free plan
// and should fall back to FREE_PLAN_DEFAULTS.
//
// IMPORTANT: Never use `subscription?.maxStudents ?? FREE_PLAN_DEFAULTS.students`
// because that pattern would treat a DB null (unlimited) as a fallback trigger
// only when the optional chain short-circuits — which is correct — but the
// intent is easy to get wrong when subscription exists but the limit column
// is null. Use resolveLimit() everywhere instead.

export const FREE_PLAN_DEFAULTS = {
  students: 50,
  teachers: 5,
  staff: 2,
} as const;

export type ResourceLimits = {
  students: number | null; // null = unlimited
  teachers: number | null;
  staff: number | null;
};

/**
 * Resolves the effective resource limits for a school.
 *
 * @param subscription - The school's Subscription record, or null/undefined if
 *                       the school has no subscription row (free-tier default).
 * @returns An object where `null` means unlimited and a number is the hard cap.
 */
export function resolveSubscriptionLimits(
  subscription:
    | {
        maxStudents: number | null;
        maxTeachers: number | null;
        maxStaff: number | null;
        planType?: string;
      }
    | null
    | undefined,
): ResourceLimits {
  // No subscription row at all → free plan defaults.
  if (!subscription) {
    return { ...FREE_PLAN_DEFAULTS };
  }

  // Subscription exists. Use the DB values directly.
  // null in the DB explicitly means unlimited (set by premium plan) — return
  // null as-is so the caller sees "no cap". A numeric value is a hard cap.
  // If the column is undefined (not selected / not yet recorded), we fall back
  // to the free plan default as a safety net. We MUST use an explicit
  // `!== undefined` check rather than `??` because `??` also coerces null →
  // fallback, which would wrongly cap unlimited Premium plans at free defaults.
  return {
    students:
      subscription.maxStudents !== undefined
        ? subscription.maxStudents
        : FREE_PLAN_DEFAULTS.students,
    teachers:
      subscription.maxTeachers !== undefined
        ? subscription.maxTeachers
        : FREE_PLAN_DEFAULTS.teachers,
    staff:
      subscription.maxStaff !== undefined
        ? subscription.maxStaff
        : FREE_PLAN_DEFAULTS.staff,
  };
}

/**
 * Returns true if adding `countToAdd` new records would exceed the limit.
 *
 * @param current  - Current count of that resource.
 * @param limit    - The resolved limit (null = unlimited).
 * @param countToAdd - How many new records are being added (default: 1).
 */
export function wouldExceedLimit(
  current: number,
  limit: number | null,
  countToAdd = 1,
): boolean {
  if (limit === null) return false; // unlimited
  return current + countToAdd > limit;
}

/**
 * Returns the default limits for a given plan type.
 * Used when auto-populating limits on plan change.
 */
export function getDefaultLimitsForPlan(planType: string): ResourceLimits {
  switch (planType.toUpperCase()) {
    case "FREE":
      return { students: 50, teachers: 5, staff: 2 };
    case "BASIC":
      return { students: 200, teachers: 15, staff: 5 };
    case "STANDARD":
      return { students: 500, teachers: 40, staff: 15 };
    case "PREMIUM":
    case "ENTERPRISE":
      return { students: null, teachers: null, staff: null }; // unlimited
    default:
      return { students: 50, teachers: 5, staff: 2 };
  }
}
