import { PlanType, BillingCycle } from "@/lib/generated/prisma/client";

export type SubscriptionPlan = {
  id: string; // Composite key: PLAN_TYPE_CYCLE (e.g. BASIC_MONTHLY)
  name: string;
  description: string;
  planType: PlanType;
  billingCycle: BillingCycle;
  price: number;
  currency: string;
  paystackPlanCode: string; // The Plan Code from Paystack Dashboard (e.g. PLN_gx2...)
  features: {
    maxStudents: number | null;
    maxTeachers: number | null;
    maxStaff: number | null;
    description: string[];
  };
  limits: {
    students: number | null;
    teachers: number | null;
    staff: number | null;
  };
};

// Placeholder codes - User needs to update these with actual Paystack Plan Codes
const PAYSTACK_PLAN_CODES = {
  BASIC_MONTHLY: process.env.PAYSTACK_PLAN_BASIC_MONTHLY || "PLN_basic_monthly",
  BASIC_YEARLY: process.env.PAYSTACK_PLAN_BASIC_YEARLY || "PLN_basic_yearly",
  STANDARD_MONTHLY:
    process.env.PAYSTACK_PLAN_STANDARD_MONTHLY || "PLN_standard_monthly",
  STANDARD_YEARLY:
    process.env.PAYSTACK_PLAN_STANDARD_YEARLY || "PLN_standard_yearly",
  PREMIUM_MONTHLY:
    process.env.PAYSTACK_PLAN_PREMIUM_MONTHLY || "PLN_premium_monthly",
  PREMIUM_YEARLY:
    process.env.PAYSTACK_PLAN_PREMIUM_YEARLY || "PLN_premium_yearly",
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  // FREE PLAN
  {
    id: "FREE",
    name: "Free Plan",
    description: "Perfect for small schools getting started",
    planType: "FREE",
    billingCycle: "MONTHLY", // Free is always monthly effectively
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
    limits: {
      students: 50,
      teachers: 5,
      staff: 2,
    },
  },

  // BASIC PLANS
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
    limits: {
      students: 200,
      teachers: 15,
      staff: 5,
    },
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
    limits: {
      students: 200,
      teachers: 15,
      staff: 5,
    },
  },

  // STANDARD PLANS
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
    limits: {
      students: 500,
      teachers: 40,
      staff: 15,
    },
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
    limits: {
      students: 500,
      teachers: 40,
      staff: 15,
    },
  },

  // PREMIUM PLANS
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
    limits: {
      students: null,
      teachers: null,
      staff: null,
    },
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
    limits: {
      students: null,
      teachers: null,
      staff: null,
    },
  },
];

export function getPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id);
}

export function getPlanByCode(code: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.paystackPlanCode === code);
}
