// components/System/Schools/school-subscription-manager.tsx
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Crown,
  Zap,
  Loader2,
  Calendar,
  Users,
  GraduationCap,
  Briefcase,
  Shield,
  FileText,
  AlertTriangle,
  Settings2,
} from "lucide-react";
import { Prisma } from "@/lib/generated/prisma";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SUBSCRIPTION_PLANS, getPlanById } from "@/lib/subscription-plans";

type SchoolData = Prisma.SchoolGetPayload<{
  include: {
    subscription: {
      include: {
        invoices: true;
      };
    };
    organization: {
      select: {
        name: true;
        slug: true;
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

interface SchoolSubscriptionManagerProps {
  school: SchoolData;
  isSuperAdmin: boolean;
}

export function SchoolSubscriptionManager({
  school,
  isSuperAdmin,
}: SchoolSubscriptionManagerProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [planType, setPlanType] = useState<string>(
    school.subscription?.planType || "FREE",
  );
  const [planName, setPlanName] = useState(
    school.subscription?.planName || "Free Plan",
  );
  const [status, setStatus] = useState<string>(
    school.subscription?.status || "ACTIVE",
  );
  const [billingCycle, setBillingCycle] = useState(
    school.subscription?.billingCycle || "",
  );
  const [amount, setAmount] = useState(
    String(school.subscription?.amount || "0"),
  );
  const [currency, setCurrency] = useState(
    school.subscription?.currency || "GHS",
  );
  const [periodStart, setPeriodStart] = useState(
    school.subscription?.currentPeriodStart
      ? new Date(school.subscription.currentPeriodStart)
          .toISOString()
          .split("T")[0]
      : "",
  );
  const [periodEnd, setPeriodEnd] = useState(
    school.subscription?.currentPeriodEnd
      ? new Date(school.subscription.currentPeriodEnd)
          .toISOString()
          .split("T")[0]
      : "",
  );
  const [isOnTrial, setIsOnTrial] = useState(
    school.subscription?.isOnTrial || false,
  );
  const [trialEndsAt, setTrialEndsAt] = useState(
    school.subscription?.trialEndsAt
      ? new Date(school.subscription.trialEndsAt).toISOString().split("T")[0]
      : "",
  );
  const [maxStudents, setMaxStudents] = useState(
    String(school.subscription?.maxStudents || ""),
  );
  const [maxTeachers, setMaxTeachers] = useState(
    String(school.subscription?.maxTeachers || ""),
  );
  const [maxStaff, setMaxStaff] = useState(
    String(school.subscription?.maxStaff || ""),
  );
  const [manualOverride, setManualOverride] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleApplyTemplate = (planId: string) => {
    const plan = getPlanById(planId);
    if (!plan) return;

    setPlanType(plan.planType);
    setPlanName(plan.name);
    setAmount(String(plan.price));
    setCurrency(plan.currency);
    setBillingCycle(plan.billingCycle);

    if (!manualOverride) {
      setMaxStudents(
        plan.limits.students === Infinity ? "" : String(plan.limits.students),
      );
      setMaxTeachers(
        plan.limits.teachers === Infinity ? "" : String(plan.limits.teachers),
      );
      setMaxStaff(
        plan.limits.staff === Infinity ? "" : String(plan.limits.staff),
      );
    }
  };

  const handleGrantPremium = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/schools/${school.subdomain}/subscription`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planType: "PREMIUM",
            planName: "Premium Plan",
            status: "ACTIVE",
            billingCycle: "YEARLY",
            amount: "0",
            currency: "GHS",
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to grant premium");
      }

      toast.success("Premium plan granted successfully!");
      router.refresh();
    } catch (error) {
      console.error("Grant premium error:", error);
      toast.error("Failed to grant premium plan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!planType) errors.planType = "Plan type is required";
    if (!status) errors.status = "Status is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/schools/${school.subdomain}/subscription`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planType,
            planName,
            status,
            billingCycle: billingCycle || null,
            amount: amount || null,
            currency,
            currentPeriodStart: periodStart || null,
            currentPeriodEnd: periodEnd || null,
            isOnTrial,
            trialEndsAt: trialEndsAt || null,
            maxStudents: maxStudents || null,
            maxTeachers: maxTeachers || null,
            maxStaff: maxStaff || null,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update subscription");
      }

      toast.success("Subscription updated successfully!");
      setEditMode(false);
      router.refresh();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to update subscription.");
    } finally {
      setIsLoading(false);
    }
  };

  const sub = school.subscription;

  return (
    <div className="space-y-6">
      {/* Current Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {sub?.planName || "Free Plan"}
            </div>
            <Badge
              variant={sub?.planType === "PREMIUM" ? "default" : "secondary"}
              className="mt-1"
            >
              {sub?.planType || "FREE"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <Shield className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold capitalize">
              {sub?.isOnTrial ? "Trial" : sub?.status || "Active"}
            </div>
            {sub?.cancelAtPeriodEnd && (
              <p className="text-xs text-red-600 mt-1">Cancels at period end</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Period End</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {sub?.currentPeriodEnd
                ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-3 w-3" />
                <span>{school._count.students} students</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span>{school._count.teachers} teachers</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-3 w-3" />
                <span>{school._count.staff} staff</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SuperAdmin Quick Actions */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Manage this school&apos;s subscription manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={handleGrantPremium}
              disabled={isLoading}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Crown className="mr-2 h-4 w-4" />
              )}
              Grant Premium (6 Months)
            </Button>
            <Button
              variant={editMode ? "secondary" : "outline"}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? "Cancel Edit" : "Edit Subscription"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      {editMode && isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Subscription</CardTitle>
            <CardDescription>
              Manually adjust subscription settings for this school.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="bg-muted/30 p-4 rounded-lg border border-dashed mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <h3 className="font-medium text-sm">Plan Templates</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <FieldGroup>
                    <FieldLabel>Select a Plan Template</FieldLabel>
                    <Select onValueChange={handleApplyTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Standard Plans..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBSCRIPTION_PLANS.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} ({plan.currency} {plan.price})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Core Details
                  </h3>
                  <div className="grid gap-4">
                    <FieldGroup>
                      <FieldLabel htmlFor="planType">Plan Type</FieldLabel>
                      <Select value={planType} onValueChange={setPlanType}>
                        <SelectTrigger id="planType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FREE">Free</SelectItem>
                          <SelectItem value="BASIC">Basic</SelectItem>
                          <SelectItem value="STANDARD">Standard</SelectItem>
                          <SelectItem value="PREMIUM">Premium</SelectItem>
                          <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.planType && (
                        <FieldError>{formErrors.planType}</FieldError>
                      )}
                    </FieldGroup>

                    <FieldGroup>
                      <FieldLabel htmlFor="planName">Plan Name</FieldLabel>
                      <Input
                        id="planName"
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        placeholder="Premium Plan"
                      />
                    </FieldGroup>

                    <FieldGroup>
                      <FieldLabel htmlFor="status">Status</FieldLabel>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="TRIALING">Trialing</SelectItem>
                          <SelectItem value="PAST_DUE">Past Due</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          <SelectItem value="EXPIRED">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.status && (
                        <FieldError>{formErrors.status}</FieldError>
                      )}
                    </FieldGroup>

                    <FieldGroup>
                      <FieldLabel htmlFor="billingCycle">
                        Billing Cycle
                      </FieldLabel>
                      <Select
                        value={billingCycle}
                        onValueChange={setBillingCycle}
                      >
                        <SelectTrigger id="billingCycle">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldGroup>

                    <div className="grid grid-cols-2 gap-4">
                      <FieldGroup>
                        <FieldLabel htmlFor="amount">Amount</FieldLabel>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </FieldGroup>

                      <FieldGroup>
                        <FieldLabel htmlFor="currency">Currency</FieldLabel>
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger id="currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GHS">GHS</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FieldGroup>
                        <FieldLabel htmlFor="periodStart">
                          Period Start
                        </FieldLabel>
                        <Input
                          id="periodStart"
                          type="date"
                          value={periodStart}
                          onChange={(e) => setPeriodStart(e.target.value)}
                        />
                      </FieldGroup>

                      <FieldGroup>
                        <FieldLabel htmlFor="periodEnd">Period End</FieldLabel>
                        <Input
                          id="periodEnd"
                          type="date"
                          value={periodEnd}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                        />
                      </FieldGroup>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Resource Limits & Overrides
                  </h3>
                  <div className="space-y-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border bg-yellow-50/50 p-3 shadow-sm dark:bg-yellow-950/20">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                          <FieldLabel htmlFor="manualOverride">
                            Manual Limit Override
                          </FieldLabel>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Allows custom limits independent of plan defaults.
                        </p>
                      </div>
                      <Switch
                        id="manualOverride"
                        checked={manualOverride}
                        onCheckedChange={setManualOverride}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <FieldGroup>
                        <FieldLabel htmlFor="maxStudents">
                          Students Limit
                        </FieldLabel>
                        <Input
                          id="maxStudents"
                          type="number"
                          value={maxStudents}
                          onChange={(e) => setMaxStudents(e.target.value)}
                          placeholder="Unlimited"
                          disabled={!manualOverride}
                          className={!manualOverride ? "bg-muted" : ""}
                        />
                      </FieldGroup>
                      <FieldGroup>
                        <FieldLabel htmlFor="maxTeachers">
                          Teachers Limit
                        </FieldLabel>
                        <Input
                          id="maxTeachers"
                          type="number"
                          value={maxTeachers}
                          onChange={(e) => setMaxTeachers(e.target.value)}
                          placeholder="Unlimited"
                          disabled={!manualOverride}
                          className={!manualOverride ? "bg-muted" : ""}
                        />
                      </FieldGroup>
                      <FieldGroup>
                        <FieldLabel htmlFor="maxStaff">Staff Limit</FieldLabel>
                        <Input
                          id="maxStaff"
                          type="number"
                          value={maxStaff}
                          onChange={(e) => setMaxStaff(e.target.value)}
                          placeholder="Unlimited"
                          disabled={!manualOverride}
                          className={!manualOverride ? "bg-muted" : ""}
                        />
                      </FieldGroup>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                        Trial Settings
                      </h3>
                      <div className="space-y-4">
                        <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FieldLabel htmlFor="isOnTrial">On Trial</FieldLabel>
                            <p className="text-sm text-muted-foreground">
                              Toggle trial mode for this school.
                            </p>
                          </div>
                          <Switch
                            id="isOnTrial"
                            checked={isOnTrial}
                            onCheckedChange={setIsOnTrial}
                          />
                        </div>

                        {isOnTrial && (
                          <FieldGroup>
                            <FieldLabel htmlFor="trialEndsAt">
                              Trial Ends At
                            </FieldLabel>
                            <Input
                              id="trialEndsAt"
                              type="date"
                              value={trialEndsAt}
                              onChange={(e) => setTrialEndsAt(e.target.value)}
                            />
                          </FieldGroup>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

      )}

      {/* Invoice History */}
      {sub?.invoices && sub.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Invoice #</th>
                    <th className="pb-3 pr-4 font-medium">Amount</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Period</th>
                    <th className="pb-3 pr-4 font-medium">Payment Method</th>
                    <th className="pb-3 font-medium">Paid At</th>
                  </tr>
                </thead>
                <tbody>
                  {sub.invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-sm font-mono">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-3 pr-4 text-sm tabular-nums">
                        {invoice.currency} {Number(invoice.amount).toFixed(2)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            invoice.status === "PAID" ? "default" : "secondary"
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        {new Date(invoice.periodStart).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          },
                        )}{" "}
                        –{" "}
                        {new Date(invoice.periodEnd).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </td>
                      <td className="py-3 pr-4 text-sm capitalize">
                        {invoice.paymentMethod || "—"}
                      </td>
                      <td className="py-3 text-sm">
                        {invoice.paidAt
                          ? new Date(invoice.paidAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
