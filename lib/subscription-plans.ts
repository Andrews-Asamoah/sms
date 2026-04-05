// lib/subscription-plans.ts

import type { PlanType, BillingCycle } from "@/lib/generated/prisma/client";

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionPlan {
  /** Composite key: e.g. "BASIC_MONTHLY", "PREMIUM_YEARLY", "FREE" */
  id: string;
  name: string;
  description: string;
  planType: PlanType;
  billingCycle: BillingCycle | null;
  price: number;
  currency: string;
  /** Paystack Plan Code from the Paystack Dashboard (e.g. PLN_gx2...) */
  paystackPlanCode: string;
  features: {
    maxStudents: number | null;
    maxTeachers: number | null;
    maxStaff: number | null;
    description: string[];
  };
  limits: {
    /** null = unlimited */
    students: number | null;
    teachers: number | null;
    staff: number | null;
  };
}

// ============================================================================
// PAYSTACK PLAN CODES
// Set via environment variables — update with your actual codes from the
// Paystack Dashboard before going live.
// ============================================================================

const PAYSTACK_PLAN_CODES = {
  BASIC_MONTHLY: process.env.PAYSTACK_PLAN_BASIC_MONTHLY ?? "PLN_basic_monthly",
  BASIC_YEARLY: process.env.PAYSTACK_PLAN_BASIC_YEARLY ?? "PLN_basic_yearly",
  STANDARD_MONTHLY:
    process.env.PAYSTACK_PLAN_STANDARD_MONTHLY ?? "PLN_standard_monthly",
  STANDARD_YEARLY:
    process.env.PAYSTACK_PLAN_STANDARD_YEARLY ?? "PLN_standard_yearly",
  PREMIUM_MONTHLY:
    process.env.PAYSTACK_PLAN_PREMIUM_MONTHLY ?? "PLN_premium_monthly",
  PREMIUM_YEARLY:
    process.env.PAYSTACK_PLAN_PREMIUM_YEARLY ?? "PLN_premium_yearly",
} as const;

// ============================================================================
// PLAN DEFINITIONS
// ============================================================================

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  // ── Free ──────────────────────────────────────────────────────────────────
  {
    id: "FREE",
    name: "Free Plan",
    description: "Perfect for small schools getting started",
    planType: "FREE",
    billingCycle: null,
    price: 0,
    currency: "GHS",
    paystackPlanCode: "",
    features: {
      maxStudents: 50,
      maxTeachers: 5,
      maxStaff: 2,
      description: [
        "Up to 50 students",
        "Up to 5 teachers",
        "Up to 2 staff members",
        "Basic student management",
        "Grade entry",
        "Attendance tracking",
      ],
    },
    limits: { students: 50, teachers: 5, staff: 2 },
  },

  // ── Basic ─────────────────────────────────────────────────────────────────
  {
    id: "BASIC_MONTHLY",
    name: "Basic Plan (Monthly)",
    description: "Essential features for growing schools",
    planType: "BASIC",
    billingCycle: "MONTHLY",
    price: 120,
    currency: "GHS",
    paystackPlanCode: PAYSTACK_PLAN_CODES.BASIC_MONTHLY,
    features: {
      maxStudents: 200,
      maxTeachers: 15,
      maxStaff: 5,
      description: [
        "Up to 200 students",
        "Up to 15 teachers",
        "Up to 5 staff members",
        "Parent Portal Lite",
        "Email Support",
      ],
    },
    limits: { students: 200, teachers: 15, staff: 5 },
  },
  {
    id: "BASIC_YEARLY",
    name: "Basic Plan (Yearly)",
    description: "Essential features for growing schools (2 months free)",
    planType: "BASIC",
    billingCycle: "YEARLY",
    price: 1200,
    currency: "GHS",
    paystackPlanCode: PAYSTACK_PLAN_CODES.BASIC_YEARLY,
    features: {
      maxStudents: 200,
      maxTeachers: 15,
      maxStaff: 5,
      description: [
        "Up to 200 students",
        "Up to 15 teachers",
        "Up to 5 staff members",
        "Parent Portal Lite",
        "Email Support",
        "2 Months Free",
      ],
    },
    limits: { students: 200, teachers: 15, staff: 5 },
  },

  // ── Standard ──────────────────────────────────────────────────────────────
  {
    id: "STANDARD_MONTHLY",
    name: "Standard Plan (Monthly)",
    description: "Advanced management for established schools",
    planType: "STANDARD",
    billingCycle: "MONTHLY",
    price: 300,
    currency: "GHS",
    paystackPlanCode: PAYSTACK_PLAN_CODES.STANDARD_MONTHLY,
    features: {
      maxStudents: 500,
      maxTeachers: 40,
      maxStaff: 15,
      description: [
        "Up to 500 students",
        "Up to 40 teachers",
        "Up to 15 staff members",
        "Parent Portal Standard",
        "Priority Email Support",
        "Advanced Reports",
      ],
    },
    limits: { students: 500, teachers: 40, staff: 15 },
  },
  {
    id: "STANDARD_YEARLY",
    name: "Standard Plan (Yearly)",
    description: "Advanced management for established schools (2 months free)",
    planType: "STANDARD",
    billingCycle: "YEARLY",
    price: 3000,
    currency: "GHS",
    paystackPlanCode: PAYSTACK_PLAN_CODES.STANDARD_YEARLY,
    features: {
      maxStudents: 500,
      maxTeachers: 40,
      maxStaff: 15,
      description: [
        "Up to 500 students",
        "Up to 40 teachers",
        "Up to 15 staff members",
        "Parent Portal Standard",
        "Priority Email Support",
        "Advanced Reports",
        "2 Months Free",
      ],
    },
    limits: { students: 500, teachers: 40, staff: 15 },
  },

  // ── Premium ───────────────────────────────────────────────────────────────
  {
    id: "PREMIUM_MONTHLY",
    name: "Premium Plan (Monthly)",
    description: "Unlimited possibilities for large institutions",
    planType: "PREMIUM",
    billingCycle: "MONTHLY",
    price: 600,
    currency: "GHS",
    paystackPlanCode: PAYSTACK_PLAN_CODES.PREMIUM_MONTHLY,
    features: {
      maxStudents: null,
      maxTeachers: null,
      maxStaff: null,
      description: [
        "Unlimited students",
        "Unlimited teachers",
        "Unlimited staff",
        "Full Parent Portal Access",
        "Dedicated Support",
        "Custom Branding",
        "API Access",
      ],
    },
    limits: { students: null, teachers: null, staff: null },
  },
  {
    id: "PREMIUM_YEARLY",
    name: "Premium Plan (Yearly)",
    description:
      "Unlimited possibilities for large institutions (2 months free)",
    planType: "PREMIUM",
    billingCycle: "YEARLY",
    price: 6000,
    currency: "GHS",
    paystackPlanCode: PAYSTACK_PLAN_CODES.PREMIUM_YEARLY,
    features: {
      maxStudents: null,
      maxTeachers: null,
      maxStaff: null,
      description: [
        "Unlimited students",
        "Unlimited teachers",
        "Unlimited staff",
        "Full Parent Portal Access",
        "Dedicated Support",
        "Custom Branding",
        "API Access",
        "2 Months Free",
      ],
    },
    limits: { students: null, teachers: null, staff: null },
  },
];

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

/**
 * Finds a plan by its composite ID (e.g. "BASIC_MONTHLY", "FREE").
 * Returns undefined if not found — callers should handle this case.
 */
export function getPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id);
}

/**
 * Finds a plan by its Paystack plan code.
 * Returns undefined if not found.
 */
export function getPlanByCode(code: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.paystackPlanCode === code);
}
