// components/school/users/school-subscription.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Crown,
  Zap,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Clock,
  AlertTriangle,
  Info,
  Lock,
  Receipt,
  BanknoteIcon,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SUBSCRIPTION_PLANS, getPlanById } from "@/lib/subscription-plans";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ============================================================================
// TYPES
// ============================================================================

type SchoolWithSubscriptionData = Prisma.SchoolGetPayload<{
  include: {
    subscription: {
      include: {
        invoices: true;
      };
    };
    organization: {
      include: {
        members: true;
      };
    };
    _count: {
      select: {
        students: true;
        teachers: true;
        staff: true;
      };
    };
  };
}>;

interface SchoolSubscriptionProps {
  school: SchoolWithSubscriptionData;
  isSuperAdmin?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculates a usage percentage for display in Progress bars.
 * When limit is null (unlimited), returns 0 so the bar stays empty.
 */
function usagePercent(current: number, limit: number | null): number {
  if (limit === null) return 0;
  return Math.min((current / limit) * 100, 100);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SchoolSubscription({
  school,
  isSuperAdmin = false,
}: SchoolSubscriptionProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY",
  );
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // ── Subscription status derivation ────────────────────────────────────────

  const subscriptionStatus = useMemo(() => {
    const subscription = school.subscription;

    if (!subscription) {
      return {
        isPremium: false,
        isOnTrial: false,
        trialDaysRemaining: 0,
        canAccessPremiumFeatures: false,
        isActive: false,
        isPastDue: false,
        isExpired: false,
        planName: "Free Plan",
        currentPlanId: "FREE",
        billingCycle: null,
        status: null,
      };
    }

    const now = new Date();
    const trialEndsAt = subscription.trialEndsAt
      ? new Date(subscription.trialEndsAt)
      : null;
    const isOnTrial =
      subscription.isOnTrial && trialEndsAt != null && now < trialEndsAt;

    const trialDaysRemaining =
      isOnTrial && trialEndsAt
        ? Math.max(
            0,
            Math.ceil(
              (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            ),
          )
        : 0;

    const isPremium = subscription.planType !== "FREE";
    const isExpired = subscription.status === "EXPIRED";
    const canAccessPremiumFeatures = (isPremium || isOnTrial) && !isExpired;
    const isActive =
      subscription.status === "ACTIVE" ||
      subscription.status === "TRIALING" ||
      subscription.status === "PAST_DUE";
    const isPastDue = subscription.status === "PAST_DUE";

    const currentPlanId =
      SUBSCRIPTION_PLANS.find(
        (p) =>
          p.planType === subscription.planType &&
          p.billingCycle === subscription.billingCycle,
      )?.id ?? (isPremium ? "CUSTOM" : "FREE");

    return {
      isPremium,
      isOnTrial,
      trialDaysRemaining,
      canAccessPremiumFeatures,
      isActive,
      isPastDue,
      isExpired,
      planName: subscription.planName,
      currentPlanId,
      billingCycle: subscription.billingCycle,
      status: subscription.status,
    };
  }, [school.subscription]);

  // ── Resource limits ────────────────────────────────────────────────────────
  //
  // null in the DB means unlimited. The Infinity comparisons in the original
  // were dead code — Prisma never returns Infinity. Removed entirely.
  //
  const limits = useMemo(
    () =>
      school.subscription
        ? {
            students: school.subscription.maxStudents,
            teachers: school.subscription.maxTeachers,
            staff: school.subscription.maxStaff,
          }
        : { students: 50, teachers: 5, staff: 2 },
    [school.subscription],
  );

  const isApproachingStudentLimit =
    limits.students !== null && school._count.students >= limits.students * 0.8;
  const isApproachingTeacherLimit =
    limits.teachers !== null && school._count.teachers >= limits.teachers * 0.8;
  const isApproachingStaffLimit =
    limits.staff !== null && school._count.staff >= limits.staff * 0.8;

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleUpgrade = async (planId: string) => {
    setIsLoading(planId);
    try {
      const response = await fetch(
        `/api/schools/${school.subdomain}/subscription/initialize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, billingCycle }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Failed to initialize payment");
      }

      const paymentData = await response.json();

      if (paymentData.scheduled) {
        toast.success(
          paymentData.message ?? "Plan change scheduled successfully.",
        );
        router.refresh();
        return;
      }

      if (paymentData.authorization_url) {
        window.location.href = paymentData.authorization_url;
      } else {
        throw new Error("No authorization URL received");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upgrade. Please try again.",
      );
    } finally {
      setIsLoading(null);
    }
  };

  const handleUpdateCard = async () => {
    setIsLoading("UPDATE_CARD");
    try {
      const response = await fetch(
        `/api/schools/${school.subdomain}/subscription/initialize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestType: "CARD_UPDATE" }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Failed to initialize card update");
      }

      const data = await response.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No authorization URL received");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to initiate card update",
      );
    } finally {
      setIsLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setIsLoading("CANCEL");
    try {
      const response = await fetch(
        `/api/schools/${school.subdomain}/subscription/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      const data = await response.json();
      toast.success(data.message ?? "Subscription cancelled successfully.");
      router.refresh();
    } catch (error) {
      toast.error("Failed to cancel subscription. Please try again.");
    } finally {
      setIsLoading(null);
      setIsCancelDialogOpen(false);
    }
  };

  const availablePlans = SUBSCRIPTION_PLANS.filter(
    (plan) => plan.id === "FREE" || plan.billingCycle === billingCycle,
  );

  const pendingPlanId = (school.subscription?.settings as any)?.pendingPlanId;
  const pendingPlan = pendingPlanId ? getPlanById(pendingPlanId) : null;

  // Derive the pending (unpaid) invoice, if any
  const pendingInvoice = useMemo(
    () =>
      school.subscription?.invoices?.find((inv) => inv.status === "PENDING") ??
      null,
    [school.subscription?.invoices],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Unpaid invoice alert ── */}
      {pendingInvoice && (
        <Alert className="border-orange-500/60 bg-orange-50/10 dark:bg-orange-900/10">
          <BanknoteIcon className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-700 dark:text-orange-400 font-semibold">
            Outstanding Invoice — Payment Required
          </AlertTitle>
          <AlertDescription className="text-orange-700/80 dark:text-orange-400/70 space-y-3">
            <p>
              Invoice{" "}
              <span className="font-mono font-medium">
                {pendingInvoice.invoiceNumber}
              </span>{" "}
              for{" "}
              <span className="font-bold">
                {pendingInvoice.currency}{" "}
                {Number(pendingInvoice.amount).toFixed(2)}
              </span>{" "}
              is awaiting payment. Please renew your current plan below to settle
              this balance. Plan changes are locked until this invoice is paid.
            </p>
            <p className="text-xs">
              Period:{" "}
              {format(new Date(pendingInvoice.periodStart), "PPP")} –{" "}
              {format(new Date(pendingInvoice.periodEnd), "PPP")}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Pending downgrade notice */}
      {pendingPlan && (
        <Alert className="border-yellow-500/50 bg-yellow-50/5">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">
            Plan Change Scheduled
          </AlertTitle>
          <AlertDescription className="text-yellow-700">
            Your plan will switch to{" "}
            <span className="font-bold">{pendingPlan.name}</span> at the end of
            your current billing period
            {school.subscription?.currentPeriodEnd
              ? ` (${format(new Date(school.subscription.currentPeriodEnd), "PPP")})`
              : ""}
            .
          </AlertDescription>
        </Alert>
      )}

      {/* Cancellation notice */}
      {school.subscription?.cancelAtPeriodEnd && !pendingPlan && (
        <Alert className="border-red-500/50 bg-red-500/5">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">
            Subscription Canceled
          </AlertTitle>
          <AlertDescription className="text-red-700">
            Your subscription has been canceled and will expire on{" "}
            <span className="font-bold">
              {school.subscription.currentPeriodEnd
                ? format(new Date(school.subscription.currentPeriodEnd), "PPP")
                : "the end of the billing period"}
            </span>
            . You retain access until then.
          </AlertDescription>
        </Alert>
      )}

      {/* Current plan card */}
      <Card className="backdrop-blur-xl bg-background/60 border-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {subscriptionStatus.canAccessPremiumFeatures ? (
                  <>
                    <div className="rounded-full bg-yellow-500/10 p-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                    </div>
                    {subscriptionStatus.planName}
                  </>
                ) : (
                  <>
                    <div className="rounded-full bg-primary/10 p-2">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    Free Plan
                  </>
                )}
              </CardTitle>
              <CardDescription className="mt-2">
                {subscriptionStatus.canAccessPremiumFeatures
                  ? `You are on the ${subscriptionStatus.planName}`
                  : "You're on the free plan with limited features."}
              </CardDescription>
            </div>
            <Badge
              variant={
                subscriptionStatus.isExpired
                  ? "destructive"
                  : subscriptionStatus.isPastDue
                    ? "outline"
                    : subscriptionStatus.canAccessPremiumFeatures
                      ? "default"
                      : "secondary"
              }
              className={`text-base px-4 py-2 ${
                subscriptionStatus.isPastDue
                  ? "border-yellow-500 text-yellow-600 bg-yellow-50"
                  : ""
              }`}
            >
              {subscriptionStatus.isExpired
                ? "Expired"
                : subscriptionStatus.isPastDue
                  ? "Past Due"
                  : subscriptionStatus.isActive
                    ? "Active"
                    : subscriptionStatus.isOnTrial
                      ? "Trial"
                      : "Free Tier"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptionStatus.isExpired && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Subscription Expired</AlertTitle>
              <AlertDescription>
                Your access to premium features has been restricted. Please
                renew your subscription to restore service.
              </AlertDescription>
            </Alert>
          )}

          {subscriptionStatus.isPastDue && (
            <Alert className="border-yellow-500/50 bg-yellow-50/50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">
                Payment Past Due
              </AlertTitle>
              <AlertDescription className="text-yellow-700">
                Your last payment failed. Update your payment method to avoid
                interruption.
              </AlertDescription>
            </Alert>
          )}

          {subscriptionStatus.isOnTrial && (
            <Alert
              variant={
                subscriptionStatus.trialDaysRemaining <= 7
                  ? "destructive"
                  : "default"
              }
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {subscriptionStatus.trialDaysRemaining <= 7
                  ? "Trial ending soon"
                  : "Trial period active"}
              </AlertTitle>
              <AlertDescription>
                Your premium trial ends in{" "}
                {subscriptionStatus.trialDaysRemaining}{" "}
                {subscriptionStatus.trialDaysRemaining === 1 ? "day" : "days"}.
                Upgrade to continue enjoying premium features.
              </AlertDescription>
            </Alert>
          )}

          {(isApproachingStudentLimit ||
            isApproachingTeacherLimit ||
            isApproachingStaffLimit) && (
            <Alert className="border-yellow-500/50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle>Approaching plan limits</AlertTitle>
              <AlertDescription>
                {isApproachingStudentLimit &&
                  `${school._count.students} / ${limits.students} students. `}
                {isApproachingTeacherLimit &&
                  `${school._count.teachers} / ${limits.teachers} teachers. `}
                {isApproachingStaffLimit &&
                  `${school._count.staff} / ${limits.staff} staff. `}
                Consider upgrading for more capacity.
              </AlertDescription>
            </Alert>
          )}

          {/* Usage meters */}
          <div className="grid gap-4 md:grid-cols-3">
            {(
              [
                {
                  label: "Students",
                  count: school._count.students,
                  limit: limits.students,
                },
                {
                  label: "Teachers",
                  count: school._count.teachers,
                  limit: limits.teachers,
                },
                {
                  label: "Staff",
                  count: school._count.staff,
                  limit: limits.staff,
                },
              ] as const
            ).map(({ label, count, limit }) => (
              <div
                key={label}
                className="space-y-2 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <p className="text-sm text-muted-foreground font-medium">
                  {label}
                </p>
                <p className="text-2xl font-bold tabular-nums">{count}</p>
                <Progress value={usagePercent(count, limit)} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {limit === null ? "Unlimited" : `${count} / ${limit} limit`}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing cycle toggle */}
      <div className="flex flex-col items-center space-y-4">
        <Tabs
          defaultValue="MONTHLY"
          value={billingCycle}
          onValueChange={(v) => setBillingCycle(v as "MONTHLY" | "YEARLY")}
          className="w-full max-w-[400px]"
        >
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-primary/5 border border-primary/10">
            <TabsTrigger
              value="MONTHLY"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              Monthly billing
            </TabsTrigger>
            <TabsTrigger
              value="YEARLY"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              Yearly billing
              <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-[10px] px-1.5 h-4 border-none">
                -20%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {billingCycle === "YEARLY" && (
          <p className="text-sm font-medium text-green-600 flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            Get 2 months free with annual billing!
          </p>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 lg:grid-cols-4">
        {availablePlans.map((plan) => {
          const isActivePlan =
            school.subscription?.planType === plan.planType &&
            (plan.id === "FREE" ||
              school.subscription?.billingCycle === plan.billingCycle) &&
            !subscriptionStatus.isExpired;

          const isExpiredCurrentPlan =
            subscriptionStatus.isExpired &&
            school.subscription?.planType === plan.planType &&
            school.subscription?.billingCycle === plan.billingCycle;

          return (
            <Card
              key={plan.id}
              className={`backdrop-blur-xl bg-background/60 transition-all duration-300 flex flex-col ${
                isActivePlan
                  ? "border-primary/30 shadow-lg scale-[1.02] ring-2 ring-primary/10"
                  : "border-primary/10 hover:border-primary/20 hover:shadow-lg"
              }`}
            >
              <CardHeader>
                <CardTitle className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-lg">
                      {plan.planType === "PREMIUM" && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      {plan.name
                        .replace(" (Monthly)", "")
                        .replace(" (Yearly)", "")}
                    </span>
                    {plan.billingCycle === "YEARLY" && plan.id !== "FREE" && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px] font-bold">
                        SAVE 20%
                      </Badge>
                    )}
                  </div>
                  <div className="text-3xl font-bold flex items-baseline gap-1">
                    {plan.currency} {plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.billingCycle === "MONTHLY" ? "mo" : "yr"}
                    </span>
                  </div>
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <div className="space-y-2 text-sm">
                  {plan.features.description.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                {isActivePlan ? (
                  <Button variant="outline" className="w-full" disabled>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Current Plan
                  </Button>
                ) : pendingInvoice && plan.id !== subscriptionStatus.currentPlanId ? (
                  // Block switching to a DIFFERENT plan while an invoice is outstanding
                  <Button
                    variant="outline"
                    className="w-full opacity-60 cursor-not-allowed"
                    disabled
                    title="Settle your outstanding invoice before switching plans"
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Pay Invoice First
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${
                      plan.planType === "PREMIUM"
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                        : ""
                    }`}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!isLoading}
                    variant={plan.id === "FREE" ? "outline" : "default"}
                  >
                    {isLoading === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <TrendingUp className="mr-2 h-4 w-4" />
                    )}
                    {isExpiredCurrentPlan
                      ? "Renew Plan"
                      : pendingInvoice
                        ? "Pay & Renew"
                        : "Upgrade"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Billing information */}
      <Card className="backdrop-blur-xl bg-background/60 border-primary/10">
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
          <CardDescription>Manage your payment details and invoice history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {subscriptionStatus.isPremium &&
          school.subscription?.currentPeriodEnd ? (
            <>
              <div className="flex items-center gap-2 text-sm p-4 rounded-lg bg-primary/5">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  Next billing date:
                </span>
                <span className="font-medium">
                  {new Date(
                    school.subscription.currentPeriodEnd,
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-4 rounded-xl flex gap-3">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                    How card updates work
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/60 mt-1 leading-relaxed">
                    Paystack requires a minimal verification charge of{" "}
                    <span className="font-bold">GH₵ 0.10</span> to securely link
                    your new card. This is a one-time verification fee, not part
                    of your subscription.
                  </p>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleUpdateCard}
                  disabled={!!isLoading}
                >
                  {isLoading === "UPDATE_CARD" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Payment Method
                </Button>

                <AlertDialog
                  open={isCancelDialogOpen}
                  onOpenChange={setIsCancelDialogOpen}
                >
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setIsCancelDialogOpen(true)}
                    disabled={!!isLoading}
                  >
                    {isLoading === "CANCEL" && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Cancel Subscription
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your subscription will be cancelled but you will retain
                        access until{" "}
                        {new Date(
                          school.subscription.currentPeriodEnd,
                        ).toLocaleDateString()}
                        . No further charges will be made.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelSubscription}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isLoading === "CANCEL" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          "Cancel Subscription"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No active recurring subscription.
              </p>
            </div>
          )}

          {/* ── Invoice History ── */}
          {school.subscription?.invoices && school.subscription.invoices.length > 0 && (
            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Invoice History</h3>
              </div>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Period</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Paid On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {school.subscription.invoices.map((inv, idx) => (
                      <tr
                        key={inv.id}
                        className={`border-b border-border/30 last:border-0 transition-colors ${
                          inv.status === "PENDING"
                            ? "bg-orange-50/30 dark:bg-orange-900/10"
                            : idx % 2 === 0
                              ? "bg-background"
                              : "bg-muted/20"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {format(new Date(inv.periodStart), "MMM d, yyyy")} –{" "}
                          {format(new Date(inv.periodEnd), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {inv.currency} {Number(inv.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={inv.status === "PAID" ? "default" : inv.status === "PENDING" ? "outline" : "destructive"}
                            className={`text-[10px] px-2 py-0.5 ${
                              inv.status === "PAID"
                                ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                                : inv.status === "PENDING"
                                  ? "border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400"
                                  : ""
                            }`}
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground hidden md:table-cell">
                          {inv.paidAt
                            ? format(new Date(inv.paidAt), "MMM d, yyyy")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
