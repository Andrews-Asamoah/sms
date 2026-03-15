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
} from "lucide-react";
import { Prisma } from "@/lib/generated/prisma";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SUBSCRIPTION_PLANS, getPlanById } from "@/lib/subscription-plans";
import { format } from "date-fns";
import { Clock, AlertTriangle, Info } from "lucide-react";
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

type SchoolWithSubscriptionData = Prisma.SchoolGetPayload<{
  include: {
    subscription: true;
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

  const subscriptionStatus = useMemo(() => {
    const subscription = school.subscription;

    if (!subscription) {
      return {
        isPremium: false,
        isOnTrial: false,
        trialDaysRemaining: 0,
        canAccessPremiumFeatures: false,
        isActive: false,
        planName: "Free Plan",
        currentPlanId: "FREE",
      };
    }

    const now = new Date();
    const trialEndsAt = subscription.trialEndsAt;
    const isOnTrial =
      subscription.isOnTrial && trialEndsAt && now < new Date(trialEndsAt);

    const trialDaysRemaining =
      isOnTrial && trialEndsAt
        ? Math.max(
            0,
            Math.ceil(
              (new Date(trialEndsAt).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 0;

    const isPremium = subscription.planType !== "FREE";
    const canAccessPremiumFeatures =
      (isPremium || isOnTrial) && subscription.status !== "EXPIRED";
    const isActive =
      subscription.status === "ACTIVE" ||
      subscription.status === "TRIALING" ||
      subscription.status === "PAST_DUE";
    const isPastDue = subscription.status === "PAST_DUE";
    const isExpired = subscription.status === "EXPIRED";

    const currentPlanId =
      SUBSCRIPTION_PLANS.find(
        (p: any) =>
          p.planType === subscription.planType &&
          p.billingCycle === subscription.billingCycle,
      )?.id || (isPremium ? "CUSTOM" : "FREE");

    return {
      isPremium,
      isOnTrial,
      trialDaysRemaining,
      canAccessPremiumFeatures,
      isActive,
      planName: subscription.planName,
      currentPlanId,
      billingCycle: subscription.billingCycle,
      status: subscription.status,
      isExpired,
      isPastDue,
    };
  }, [school.subscription]);

  const limits = useMemo(() => {
    return {
      students: school.subscription?.maxStudents ?? 50,
      teachers: school.subscription?.maxTeachers ?? 5,
      staff: school.subscription?.maxStaff ?? 2,
    };
  }, [school.subscription]);

  const studentUsagePercent = Math.min(
    (school._count.students /
      (limits.students === Infinity ? 10000 : limits.students)) *
      100,
    100,
  );
  const teacherUsagePercent = Math.min(
    (school._count.teachers /
      (limits.teachers === Infinity ? 1000 : limits.teachers)) *
      100,
    100,
  );
  const staffUsagePercent = Math.min(
    (school._count.staff / (limits.staff === Infinity ? 500 : limits.staff)) *
      100,
    100,
  );

  const isApproachingStudentLimit =
    limits.students !== Infinity &&
    school._count.students >= limits.students * 0.8;
  const isApproachingTeacherLimit =
    limits.teachers !== Infinity &&
    school._count.teachers >= limits.teachers * 0.8;
  const isApproachingStaffLimit =
    limits.staff !== Infinity && school._count.staff >= limits.staff * 0.8;

  const handleUpgrade = async (planId: string) => {
    setIsLoading(planId);
    try {
      const initResponse = await fetch(
        `/api/schools/${school.subdomain}/subscription/initialize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId,
            billingCycle,
          }),
        },
      );

      if (!initResponse.ok) {
        const err = await initResponse.json();
        throw new Error(err.error || "Failed to initialize payment");
      }

      const paymentData = await initResponse.json();

      if (paymentData.scheduled) {
        toast.success(
          paymentData.message || "Plan change scheduled successfully.",
        );
        router.refresh();
        return;
      }

      if (paymentData.authorization_url) {
        sessionStorage.setItem("paystack_reference", paymentData.reference);
        sessionStorage.setItem("paystack_school_subdomain", school.subdomain);
        window.location.href = paymentData.authorization_url;
      } else {
        throw new Error("No authorization URL received");
      }
    } catch (error) {
      console.error("Upgrade error:", error);
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
          body: JSON.stringify({
            requestType: "CARD_UPDATE",
          }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to initialize card update");
      }

      const data = await response.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No authorization URL received");
      }
    } catch (error) {
      console.error("Card update error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to initiate card update",
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

      toast.success("Subscription cancelled successfully");
      router.refresh();
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("Failed to cancel subscription. Please try again.");
    } finally {
      setIsLoading(null);
      setIsCancelDialogOpen(false);
    }
  };

  const availablePlans = SUBSCRIPTION_PLANS.filter(
    (plan: any) => plan.id === "FREE" || plan.billingCycle === billingCycle,
  );

  const pendingPlanId = (school.subscription?.settings as any)?.pendingPlanId;
  const pendingPlan = pendingPlanId ? getPlanById(pendingPlanId) : null;

  return (
    <div className="space-y-8">
      {pendingPlan && (
        <Alert className="border-yellow-500/50 bg-yellow-50/5">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">
            Plan Change Scheduled
          </AlertTitle>
          <AlertDescription className="text-yellow-700">
            Your plan will automatically switch to{" "}
            <span className="font-bold">{pendingPlan.name}</span> at the end of
            your current billing period (
            {school.subscription?.currentPeriodEnd
              ? format(new Date(school.subscription.currentPeriodEnd), "PPP")
              : "soon"}
            ).
          </AlertDescription>
        </Alert>
      )}

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
                : "soon"}
            </span>
            .
          </AlertDescription>
        </Alert>
      )}

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
                  ? `You are on the ${subscriptionStatus.planName} (${school.subscription?.billingCycle}).`
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
              className={`text-base px-4 py-2 ${subscriptionStatus.isPastDue ? "border-yellow-500 text-yellow-600 bg-yellow-50" : ""}`}
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
                Your last payment attempt failed. Your subscription is still
                active for now, but please update your payment method to avoid
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
              className="backdrop-blur-sm bg-background/80"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {subscriptionStatus.trialDaysRemaining <= 7
                  ? "Trial Ending Soon!"
                  : "Trial Period Active"}
              </AlertTitle>
              <AlertDescription>
                Your premium trial ends in{" "}
                {subscriptionStatus.trialDaysRemaining} day
                {subscriptionStatus.trialDaysRemaining !== 1 ? "s" : ""}.
                Upgrade to continue enjoying premium features.
              </AlertDescription>
            </Alert>
          )}

          {(isApproachingStudentLimit ||
            isApproachingTeacherLimit ||
            isApproachingStaffLimit) && (
            <Alert className="backdrop-blur-sm bg-background/80 border-yellow-500/50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle>Approaching Plan Limits</AlertTitle>
              <AlertDescription>
                {isApproachingStudentLimit &&
                  `You're using ${school._count.students} of ${limits.students} students. `}
                {isApproachingTeacherLimit &&
                  `You're using ${school._count.teachers} of ${limits.teachers} teachers. `}
                {isApproachingStaffLimit &&
                  `You're using ${school._count.staff} of ${limits.staff} staff members. `}
                Consider upgrading to a higher plan for more capacity.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
              <p className="text-sm text-muted-foreground font-medium">
                Students
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {school._count.students}
              </p>
              <Progress value={studentUsagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {limits.students === Infinity
                  ? "Unlimited"
                  : `${school._count.students}/${limits.students} limit`}
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
              <p className="text-sm text-muted-foreground font-medium">
                Teachers
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {school._count.teachers}
              </p>
              <Progress value={teacherUsagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {limits.teachers === Infinity
                  ? "Unlimited"
                  : `${school._count.teachers}/${limits.teachers} limit`}
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
              <p className="text-sm text-muted-foreground font-medium">Staff</p>
              <p className="text-2xl font-bold tabular-nums">
                {school._count.staff}
              </p>
              <Progress value={staffUsagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {limits.staff === Infinity
                  ? "Unlimited"
                  : `${school._count.staff}/${limits.staff} limit`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all relative overflow-hidden"
            >
              Yearly billing
              <Badge
                variant="default"
                className="ml-2 bg-green-500 hover:bg-green-600 text-[10px] px-1.5 h-4 border-none"
              >
                -20%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {billingCycle === "YEARLY" && (
          <p className="text-sm font-medium text-green-600 flex items-center gap-1 animate-pulse">
            <Sparkles className="h-4 w-4" />
            Get 2 months free with annual billing!
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {availablePlans.map((plan: any) => {
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
                  <div className="flex flex-col">
                    <div className="text-3xl font-bold flex items-baseline gap-1">
                      {plan.currency} {plan.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.billingCycle === "MONTHLY" ? "mo" : "yr"}
                      </span>
                    </div>
                  </div>
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <div className="space-y-2 text-sm">
                  {plan.features.description.map((feature: string, index: number) => (
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
                ) : (
                  <Button
                    className={`w-full ${plan.planType === "PREMIUM" ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600" : ""}`}
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
                      : "Upgrade"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Card className="backdrop-blur-xl bg-background/60 border-primary/10">
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
          <CardDescription>Manage your payment details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-400">How Card Updates Work</p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/60 mt-1 leading-relaxed">
                    Paystack requires a minimal verification charge of <span className="font-bold">GH₵ 0.10</span> to securely link your new card. This is a one-time card verification fee, not part of your subscription.
                  </p>
                </div>
              </div>
              <div className="pt-4 space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleUpdateCard}
                  disabled={!!isLoading}
                >
                  {isLoading === "UPDATE_CARD" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Update Payment Method
                </Button>
                
                <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setIsCancelDialogOpen(true)}
                    disabled={!!isLoading}
                  >
                    {isLoading === "CANCEL" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Cancel Subscription
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel your premium subscription. You will lose access to premium features at the end of your current billing period on {new Date(school.subscription.currentPeriodEnd).toLocaleDateString()}.
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
                        ) : "Cancel Subscription"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No active recurring subscription.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
