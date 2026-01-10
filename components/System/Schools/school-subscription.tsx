// components/System/Schools/school-subscription.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Check,
  X,
  Crown,
  Zap,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Prisma } from "@/lib/generated/prisma";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
}

const FREE_LIMITS = {
  students: 50,
  teachers: 10,
  staff: 5,
};

const FEATURES = {
  free: [
    { name: "Up to 50 students", included: true },
    { name: "Up to 10 teachers", included: true },
    { name: "Up to 5 staff members", included: true },
    { name: "Basic student management", included: true },
    { name: "Grade entry", included: true },
    { name: "Attendance tracking", included: true },
    { name: "Basic reports", included: true },
    { name: "Email support", included: true },
    { name: "Advanced analytics", included: false },
    { name: "Custom branding", included: false },
    { name: "API access", included: false },
    { name: "Multiple academic years", included: false },
    { name: "Priority support", included: false },
  ],
  premium: [
    { name: "Unlimited students", included: true },
    { name: "Unlimited teachers", included: true },
    { name: "Unlimited staff", included: true },
    { name: "Advanced student management", included: true },
    { name: "Comprehensive grading system", included: true },
    { name: "Advanced attendance tracking", included: true },
    { name: "Advanced reports & analytics", included: true },
    { name: "Priority email & chat support", included: true },
    { name: "Custom dashboards", included: true },
    { name: "Full branding customization", included: true },
    { name: "API access", included: true },
    { name: "Unlimited academic years", included: true },
    { name: "White-label options", included: true },
  ],
};

export function SchoolSubscription({ school }: SchoolSubscriptionProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const subscriptionStatus = useMemo(() => {
    const subscription = school.subscription;

    if (!subscription) {
      return {
        isPremium: false,
        isOnTrial: false,
        trialDaysRemaining: 0,
        canAccessPremiumFeatures: false,
        isActive: false,
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
                (1000 * 60 * 60 * 24)
            )
          )
        : 0;

    const isPremium =
      subscription.planType === "PREMIUM" ||
      subscription.planType === "ENTERPRISE";
    const canAccessPremiumFeatures = isPremium || isOnTrial;
    const isActive =
      subscription.status === "ACTIVE" || subscription.status === "TRIALING";

    return {
      isPremium,
      isOnTrial,
      trialDaysRemaining,
      canAccessPremiumFeatures,
      isActive,
    };
  }, [school.subscription]);

  const studentUsagePercent = subscriptionStatus.isPremium
    ? Math.min((school._count.students / 1000) * 100, 100)
    : Math.min((school._count.students / FREE_LIMITS.students) * 100, 100);

  const teacherUsagePercent = subscriptionStatus.isPremium
    ? Math.min((school._count.teachers / 100) * 100, 100)
    : Math.min((school._count.teachers / FREE_LIMITS.teachers) * 100, 100);

  const staffUsagePercent = subscriptionStatus.isPremium
    ? Math.min((school._count.staff / 50) * 100, 100)
    : Math.min((school._count.staff / FREE_LIMITS.staff) * 100, 100);

  const isApproachingStudentLimit =
    !subscriptionStatus.isPremium &&
    school._count.students >= FREE_LIMITS.students * 0.8;
  const isApproachingTeacherLimit =
    !subscriptionStatus.isPremium &&
    school._count.teachers >= FREE_LIMITS.teachers * 0.8;
  const isApproachingStaffLimit =
    !subscriptionStatus.isPremium &&
    school._count.staff >= FREE_LIMITS.staff * 0.8;

  const handleUpgradeToPremium = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/schools/${school.id}/subscription/upgrade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upgrade subscription");
      }

      toast.success("Successfully upgraded to Premium!");
      router.refresh();
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Failed to upgrade. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/schools/${school.id}/subscription/trial`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start trial");
      }

      toast.success("Premium trial started!");
      router.refresh();
    } catch (error) {
      console.error("Trial error:", error);
      toast.error("Failed to start trial. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period."
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/schools/${school.id}/subscription/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
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
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Plan Status */}
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
                    {subscriptionStatus.isPremium
                      ? "Premium Plan"
                      : "Premium Trial"}
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
                  ? subscriptionStatus.isPremium
                    ? "You're on the premium plan with full access to all features"
                    : "You're currently on a premium trial with full access to all features"
                  : "You're on the free plan with limited features"}
              </CardDescription>
            </div>
            <Badge
              variant={
                subscriptionStatus.canAccessPremiumFeatures
                  ? "default"
                  : "secondary"
              }
              className="text-base px-4 py-2"
            >
              {subscriptionStatus.isPremium
                ? "Active"
                : subscriptionStatus.isOnTrial
                ? "Trial"
                : "Free Tier"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trial Warning */}
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

          {/* Usage Warnings */}
          {(isApproachingStudentLimit ||
            isApproachingTeacherLimit ||
            isApproachingStaffLimit) && (
            <Alert className="backdrop-blur-sm bg-background/80 border-yellow-500/50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle>Approaching Plan Limits</AlertTitle>
              <AlertDescription>
                {isApproachingStudentLimit &&
                  `You're using ${school._count.students} of ${FREE_LIMITS.students} students. `}
                {isApproachingTeacherLimit &&
                  `You're using ${school._count.teachers} of ${FREE_LIMITS.teachers} teachers. `}
                {isApproachingStaffLimit &&
                  `You're using ${school._count.staff} of ${FREE_LIMITS.staff} staff members. `}
                Consider upgrading to Premium for unlimited access.
              </AlertDescription>
            </Alert>
          )}

          {/* Usage Stats */}
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
                {subscriptionStatus.isPremium
                  ? "Unlimited"
                  : `${school._count.students}/${FREE_LIMITS.students} limit`}
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
                {subscriptionStatus.isPremium
                  ? "Unlimited"
                  : `${school._count.teachers}/${FREE_LIMITS.teachers} limit`}
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
              <p className="text-sm text-muted-foreground font-medium">Staff</p>
              <p className="text-2xl font-bold tabular-nums">
                {school._count.staff}
              </p>
              <Progress value={staffUsagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {subscriptionStatus.isPremium
                  ? "Unlimited"
                  : `${school._count.staff}/${FREE_LIMITS.staff} limit`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Free Plan */}
        <Card
          className={`backdrop-blur-xl bg-background/60 transition-all duration-300 ${
            !subscriptionStatus.canAccessPremiumFeatures
              ? "border-primary/30 shadow-lg scale-[1.02]"
              : "border-primary/10 hover:border-primary/20"
          }`}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Free Plan
              </span>
              <Badge variant="outline" className="text-base px-3 py-1">
                $0/month
              </Badge>
            </CardTitle>
            <CardDescription>
              Perfect for small schools getting started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {FEATURES.free.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  {feature.included ? (
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  )}
                  <span
                    className={
                      feature.included
                        ? "text-sm"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>
            {!subscriptionStatus.canAccessPremiumFeatures && (
              <Button variant="outline" className="w-full" disabled>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Current Plan
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card
          className={`backdrop-blur-xl bg-background/60 transition-all duration-300 ${
            subscriptionStatus.canAccessPremiumFeatures
              ? "border-primary/30 shadow-lg scale-[1.02] ring-2 ring-primary/10"
              : "border-primary/10 hover:border-primary/20 hover:shadow-lg"
          }`}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className="rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 p-1.5">
                  <Crown className="h-4 w-4 text-white" />
                </div>
                Premium Plan
              </span>
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-base px-3 py-1">
                $99/month
              </Badge>
            </CardTitle>
            <CardDescription>
              Full-featured solution for growing schools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {FEATURES.premium.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature.name}</span>
                </div>
              ))}
            </div>
            {subscriptionStatus.isPremium ? (
              <Button variant="outline" className="w-full" disabled>
                <Crown className="mr-2 h-4 w-4" />
                Current Plan
              </Button>
            ) : subscriptionStatus.isOnTrial ? (
              <Button
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                onClick={handleUpgradeToPremium}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="mr-2 h-4 w-4" />
                )}
                Convert Trial to Premium
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  onClick={handleUpgradeToPremium}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  )}
                  Upgrade to Premium
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleStartTrial}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Start 14-Day Free Trial
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Billing Information */}
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
                    school.subscription.currentPeriodEnd
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="pt-4 space-y-2">
                <Button variant="outline" className="w-full">
                  Update Payment Method
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleCancelSubscription}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Cancel Subscription
                </Button>
              </div>
            </>
          ) : subscriptionStatus.isOnTrial &&
            school.subscription?.trialEndsAt ? (
            <>
              <div className="flex items-center gap-2 text-sm p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-muted-foreground">Trial ends:</span>
                <span className="font-medium text-blue-600">
                  {new Date(school.subscription.trialEndsAt).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </span>
              </div>
              <div className="pt-4">
                <Button
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  onClick={handleUpgradeToPremium}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Crown className="mr-2 h-4 w-4" />
                  )}
                  Subscribe to Premium
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                No active subscription or trial
              </p>
              <Button
                className="w-full max-w-xs mx-auto"
                onClick={handleStartTrial}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="mr-2 h-4 w-4" />
                )}
                Start Premium Trial
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
