import { requireSuperAdmin } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, Building2, Star } from "lucide-react";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Plans & Pricing | SuperAdmin Dashboard",
  description: "Manage subscription plans and pricing tiers",
};

// Plan definitions - in a production system these might come from DB or Stripe
const plans = [
  {
    name: "STARTER",
    label: "Starter",
    icon: <Star className="h-5 w-5 text-gray-500" />,
    price: "Free",
    priceNote: "Forever free for small schools",
    maxStudents: 50,
    maxTeachers: 5,
    features: [
      "Up to 50 students",
      "Up to 5 teachers",
      "Basic attendance tracking",
      "Simple grade management",
      "Parent portal access",
    ],
    badgeClass: "bg-gray-100 text-gray-700",
  },
  {
    name: "BASIC",
    label: "Basic",
    icon: <Zap className="h-5 w-5 text-blue-500" />,
    price: "GHS 500",
    priceNote: "per month",
    maxStudents: 300,
    maxTeachers: 20,
    features: [
      "Up to 300 students",
      "Up to 20 teachers",
      "Advanced attendance tracking",
      "Full grade & assessment management",
      "Timetable management",
      "Financial management",
      "Communication module",
    ],
    badgeClass: "bg-blue-100 text-blue-700",
  },
  {
    name: "PREMIUM",
    label: "Premium",
    icon: <Crown className="h-5 w-5 text-yellow-500" />,
    price: "GHS 1,200",
    priceNote: "per month",
    maxStudents: 1000,
    maxTeachers: 80,
    features: [
      "Up to 1,000 students",
      "Up to 80 teachers",
      "Everything in Basic",
      "Advanced analytics & reporting",
      "Inventory management",
      "Hostel management",
      "Library management",
      "Priority support",
    ],
    badgeClass: "bg-yellow-100 text-yellow-700",
    highlight: true,
  },
  {
    name: "ENTERPRISE",
    label: "Enterprise",
    icon: <Building2 className="h-5 w-5 text-purple-500" />,
    price: "Custom",
    priceNote: "Contact us for pricing",
    maxStudents: null,
    maxTeachers: null,
    features: [
      "Unlimited students & teachers",
      "Everything in Premium",
      "Custom subdomain/CNAME",
      "Dedicated database instance",
      "SLA guarantee",
      "Custom integrations",
      "Dedicated account manager",
      "24/7 priority support",
    ],
    badgeClass: "bg-purple-100 text-purple-700",
  },
];

export default async function PlansPage() {
  await requireSuperAdmin();

  // Count schools per plan type
  const planCounts = await prisma.subscription.groupBy({
    by: ["planType"],
    _count: { planType: true },
  });

  const countMap = new Map(
    planCounts.map((p) => [p.planType, p._count.planType]),
  );

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans & Pricing</h1>
          <p className="text-muted-foreground mt-2">
            Subscription tiers and feature limits for schools on the platform.
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.name} className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">
                {countMap.get(plan.name as any) ?? 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.label} schools
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`flex flex-col h-full hover:shadow-lg transition-shadow ${
              plan.highlight ? "border-primary ring-2 ring-primary/20" : ""
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                {plan.icon}
                {plan.highlight && (
                  <Badge className="text-xs bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl">{plan.label}</CardTitle>
              <div>
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground ml-1">
                  {plan.priceNote}
                </span>
              </div>
              <CardDescription className="text-xs">
                {plan.maxStudents
                  ? `Up to ${plan.maxStudents} students · ${plan.maxTeachers} teachers`
                  : "Unlimited capacity"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Billing integrations with payment processors like Paystack or Stripe
            can be configured in{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              lib/billing
            </code>
            . Enterprise pricing is negotiated directly. Contact the platform
            team to set up custom plans.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
