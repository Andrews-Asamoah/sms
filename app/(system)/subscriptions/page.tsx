// app/(system)/subscriptions/page.tsx - SuperAdmin Subscriptions Overview
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Clock, AlertTriangle, School } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription Management",
  description: "Manage all school subscriptions",
};

function getStatusBadge(
  subscription: { status: string; isOnTrial: boolean; planType: string } | null,
) {
  if (!subscription) {
    return <Badge variant="secondary">Free</Badge>;
  }
  if (subscription.isOnTrial) {
    return (
      <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/30">
        Trial
      </Badge>
    );
  }
  switch (subscription.status) {
    case "ACTIVE":
      return subscription.planType === "PREMIUM" ||
        subscription.planType === "ENTERPRISE" ? (
        <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
          Active
        </Badge>
      ) : (
        <Badge variant="secondary">Free</Badge>
      );
    case "CANCELED":
      return <Badge variant="destructive">Canceled</Badge>;
    case "INCOMPLETE_EXPIRED":
    case "UNPAID":
      return <Badge variant="destructive">Expired</Badge>;
    default:
      return <Badge variant="secondary">{subscription.status}</Badge>;
  }
}

function getPlanBadge(subscription: { planType: string } | null) {
  if (!subscription || subscription.planType === "FREE") {
    return <Badge variant="outline">Free</Badge>;
  }
  if (subscription.planType === "PREMIUM") {
    return (
      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
        Premium
      </Badge>
    );
  }
  if (subscription.planType === "ENTERPRISE") {
    return (
      <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0">
        Enterprise
      </Badge>
    );
  }
  return <Badge variant="outline">{subscription.planType}</Badge>;
}

interface SubscriptionsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SubscriptionsPage({
  searchParams,
}: SubscriptionsPageProps) {
  const session = await getSession();
  if (!session?.isSuperAdmin) {
    redirect("/auth/login");
  }

  const { status } = await searchParams;

  const schools = await prisma.school.findMany({
    include: {
      subscription: true,
      organization: {
        select: { name: true, slug: true },
      },
      _count: {
        select: {
          students: true,
          teachers: true,
          staff: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalSchools = schools.length;
  const premiumCount = schools.filter(
    (s) =>
      s.subscription?.planType === "PREMIUM" ||
      s.subscription?.planType === "ENTERPRISE",
  ).length;
  const trialCount = schools.filter((s) => s.subscription?.isOnTrial).length;
  const freeCount = schools.filter(
    (s) => !s.subscription || s.subscription.planType === "FREE",
  ).length;
  const expiredCount = schools.filter(
    (s) =>
      s.subscription?.status === "CANCELED" ||
      s.subscription?.status === "INCOMPLETE_EXPIRED" ||
      s.subscription?.status === "UNPAID",
  ).length;

  const filteredSchools = schools.filter((school) => {
    if (!status) return true;
    if (status === "active") {
      return (
        school.subscription?.status === "ACTIVE" &&
        !school.subscription?.isOnTrial
      );
    }
    if (status === "trialing") {
      return school.subscription?.isOnTrial;
    }
    if (status === "expired") {
      return (
        school.subscription?.status === "CANCELED" ||
        school.subscription?.status === "INCOMPLETE_EXPIRED" ||
        school.subscription?.status === "UNPAID" ||
        school.subscription?.status === "PAST_DUE"
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Subscription Management
        </h1>
        <p className="text-muted-foreground">
          Manage and monitor all school subscriptions across the platform.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSchools}</div>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {premiumCount}
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Trial</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{trialCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{freeCount}</div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expired/Past Due
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {expiredCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schools Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Schools</CardTitle>
          <CardDescription>
            Click on a school to manage their subscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">School</th>
                  <th className="pb-3 pr-4 font-medium">Plan</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Students</th>
                  <th className="pb-3 pr-4 font-medium">Teachers</th>
                  <th className="pb-3 pr-4 font-medium">Staff</th>
                  <th className="pb-3 font-medium">Period End</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school) => (
                  <tr
                    key={school.id}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 pr-4">
                      <Link
                        href={`/schools/${school.subdomain}/subscription`}
                        className="font-medium hover:underline"
                      >
                        {school.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {school.code}
                      </p>
                    </td>
                    <td className="py-4 pr-4">
                      {getPlanBadge(school.subscription)}
                    </td>
                    <td className="py-4 pr-4">
                      {getStatusBadge(school.subscription)}
                    </td>
                    <td className="py-4 pr-4 tabular-nums">
                      {school._count.students}
                    </td>
                    <td className="py-4 pr-4 tabular-nums">
                      {school._count.teachers}
                    </td>
                    <td className="py-4 pr-4 tabular-nums">
                      {school._count.staff}
                    </td>
                    <td className="py-4 tabular-nums text-sm">
                      {school.subscription?.currentPeriodEnd
                        ? new Date(
                            school.subscription.currentPeriodEnd,
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
                {filteredSchools.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No schools found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
