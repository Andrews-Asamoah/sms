// lib/subscriptions/plans.ts
import { SubscriptionPlan } from "./types";

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "FREE",
    name: "Free Plan",
    description: "Perfect for small schools getting started",
    price: 0,
    interval: "month",
    features: [
      "Up to 50 students",
      "Up to 10 teachers",
      "Up to 5 staff members",
      "Basic attendance tracking",
      "Grade management",
      "Parent communication",
      "Basic reports",
      "Email support",
    ],
    limits: {
      students: 50,
      teachers: 10,
      staff: 5,
    },
  },
  {
    id: "PREMIUM",
    name: "Premium Plan",
    description: "For growing schools with advanced needs",
    price: 99,
    interval: "month",
    features: [
      "Up to 500 students",
      "Up to 50 teachers",
      "Up to 20 staff members",
      "Advanced attendance analytics",
      "Custom grading systems",
      "SMS notifications",
      "Advanced reporting & analytics",
      "Financial management",
      "Document management",
      "Priority support",
      "Custom branding",
    ],
    limits: {
      students: 500,
      teachers: 50,
      staff: 20,
    },
    popular: true,
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise Plan",
    description: "Unlimited access for large institutions",
    price: 299,
    interval: "month",
    features: [
      "Unlimited students",
      "Unlimited teachers",
      "Unlimited staff",
      "Everything in Premium",
      "Dedicated account manager",
      "Custom integrations",
      "API access",
      "Advanced security features",
      "Custom training",
      "24/7 phone support",
      "SLA guarantee",
    ],
    limits: {
      students: null,
      teachers: null,
      staff: null,
    },
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  },
];

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}

export function getDefaultPlan(): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[0]; // FREE plan
}
