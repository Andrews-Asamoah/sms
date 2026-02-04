// lib/subscriptions/types.ts
import {
  PlanType,
  BillingCycle,
  SubscriptionStatus,
} from "@/lib/generated/prisma/client";

export interface SubscriptionPlan {
  id: PlanType;
  name: string;
  description: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  limits: {
    students: number | null; // null = unlimited
    teachers: number | null;
    staff: number | null;
  };
  popular?: boolean;
  stripePriceId?: string;
}

export interface SubscriptionWithSchool {
  id: string;
  schoolId: string;
  planType: PlanType;
  planName: string;
  billingCycle: BillingCycle | null;
  status: SubscriptionStatus;
  amount: number | null;
  currency: string;
  isOnTrial: boolean;
  trialStartsAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  school: {
    id: string;
    name: string;
    code: string;
    subdomain: string;
    _count: {
      students: number;
      teachers: number;
      staff: number;
    };
  };
}

export interface SubscriptionStats {
  total: number;
  active: number;
  trialing: number;
  canceled: number;
  expired: number;
  revenue: {
    monthly: number;
    yearly: number;
    total: number;
  };
}
