// components/System/Schools/school-overview.tsx
"use client";

import { Prisma } from "@/lib/generated/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  Crown,
  AlertCircle,
  Settings,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  MapPin,
} from "lucide-react";
import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

type SchoolWithDetails = Prisma.SchoolGetPayload<{
  include: {
    subscription: true;
    _count: {
      select: {
        students: true;
        teachers: true;
        classes: true;
        departments: true;
      };
    };
    academicYears: {
      where: { isCurrent: true };
      include: {
        terms: {
          where: { isCurrent: true };
        };
      };
    };
    organization: {
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true;
                name: true;
                email: true;
                image: true;
              };
            };
          };
        };
      };
    };
  };
}>;

interface SchoolOverviewProps {
  school: SchoolWithDetails;
}

export function SchoolOverview({ school }: SchoolOverviewProps) {
  // Calculate subscription status using useMemo to avoid re-calculation on every render
  const subscriptionStatus = useMemo(() => {
    const isActive =
      school.subscription?.status === "ACTIVE" ||
      school.subscription?.status === "TRIALING";
    const isPremium =
      school.subscription?.planType === "PREMIUM" ||
      school.subscription?.planType === "ENTERPRISE";
    const isOnTrial = school.subscription?.isOnTrial;

    // Calculate days remaining in trial
    const trialDaysRemaining = school.subscription?.trialEndsAt
      ? Math.ceil(
          (new Date(school.subscription.trialEndsAt).getTime() -
            new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    return {
      isActive,
      isPremium,
      isOnTrial,
      trialDaysRemaining: Math.max(0, trialDaysRemaining),
    };
  }, [school.subscription]);

  return (
    <div className="space-y-6">
      {/* Subscription Status Banner */}
      {subscriptionStatus.isOnTrial && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <AlertCircle className="h-5 w-5" />
              Trial Period Active
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              You have {subscriptionStatus.trialDaysRemaining} days remaining in
              your trial period.
              {school.subscription?.trialEndsAt && (
                <>
                  {" "}
                  Trial ends on{" "}
                  {new Date(
                    school.subscription.trialEndsAt
                  ).toLocaleDateString()}
                  .
                </>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* School Header Card with Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              {/* School Logo */}
              <div className="h-16 w-16 rounded-lg border-2 border-border overflow-hidden shrink-0 bg-muted">
                {school.logo ? (
                  <Image
                    src={school.logo}
                    alt={school.name}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                    {school.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* School Info */}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl md:text-3xl">
                  {school.name}
                </CardTitle>
                <CardDescription className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1">
                    Code: <strong>{school.code}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    Subdomain:{" "}
                    <strong className="font-mono text-xs">
                      {school.subdomain}
                    </strong>
                  </span>
                </CardDescription>
              </div>
            </div>

            {/* Actions and Status */}
            <div className="flex flex-col items-start md:items-end gap-3">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    subscriptionStatus.isActive ? "default" : "destructive"
                  }
                >
                  {subscriptionStatus.isActive ? "Active" : "Inactive"}
                </Badge>
                {subscriptionStatus.isPremium && (
                  <Badge variant="secondary" className="gap-1">
                    <Crown className="h-3 w-3" />
                    Premium
                  </Badge>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/schools/${school.id}/settings`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Settings
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link
                    href={`/${school.subdomain}/admin/dashboard`}
                    target="_blank"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Portal
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Contact Information */}
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            {school.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${school.email}`}
                  className="hover:underline text-foreground"
                >
                  {school.email}
                </a>
              </div>
            )}
            {school.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${school.phone}`}
                  className="hover:underline text-foreground"
                >
                  {school.phone}
                </a>
              </div>
            )}
            {school.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={school.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-foreground"
                >
                  {school.website}
                </a>
              </div>
            )}
            {school.address && (
              <div className="flex items-start gap-2 text-sm md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-foreground">{school.address}</span>
              </div>
            )}
          </div>

          {school.motto && (
            <div className="mt-4 p-4 border-l-4 border-primary bg-primary/5 rounded">
              <p className="text-sm italic text-muted-foreground">
                &quot;{school.motto}&quot;
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{school._count.students}</div>
            {school.subscription?.maxStudents && (
              <p className="text-xs text-muted-foreground mt-1">
                Limit: {school.subscription.maxStudents}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Teachers
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{school._count.teachers}</div>
            {school.subscription?.maxTeachers && (
              <p className="text-xs text-muted-foreground mt-1">
                Limit: {school.subscription.maxTeachers}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{school._count.classes}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {school._count.departments}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout for Additional Info */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription Details Card */}
        {school.subscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Plan Type
                  </dt>
                  <dd className="text-sm font-semibold">
                    {school.subscription.planName}
                  </dd>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Status
                  </dt>
                  <dd>
                    <Badge
                      variant={
                        subscriptionStatus.isActive ? "default" : "destructive"
                      }
                    >
                      {school.subscription.status}
                    </Badge>
                  </dd>
                </div>
                {school.subscription.billingCycle && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <dt className="text-sm font-medium text-muted-foreground">
                      Billing Cycle
                    </dt>
                    <dd className="text-sm">
                      {school.subscription.billingCycle}
                    </dd>
                  </div>
                )}
                {school.subscription.currentPeriodStart &&
                  school.subscription.currentPeriodEnd && (
                    <div className="flex justify-between items-center py-2">
                      <dt className="text-sm font-medium text-muted-foreground">
                        Current Period
                      </dt>
                      <dd className="text-sm text-right">
                        {new Date(
                          school.subscription.currentPeriodStart
                        ).toLocaleDateString()}{" "}
                        <br />
                        to{" "}
                        {new Date(
                          school.subscription.currentPeriodEnd
                        ).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
              </dl>
              <div className="mt-4">
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/schools/${school.id}/subscription`}>
                    Manage Subscription
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Academic Year */}
        {school.academicYears.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Current Academic Year</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">
                      {school.academicYears[0].name}
                    </span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  {school.academicYears[0].terms.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Current Term:{" "}
                      <strong className="text-foreground">
                        {school.academicYears[0].terms[0].name}
                      </strong>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Academic year:{" "}
                  {new Date(
                    school.academicYears[0].startDate
                  ).toLocaleDateString()}{" "}
                  -{" "}
                  {new Date(
                    school.academicYears[0].endDate
                  ).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Organization Members */}
      {school.organization.members.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Organization Members</CardTitle>
                <CardDescription>
                  Users with access to this school
                </CardDescription>
              </div>
              <Badge variant="outline">
                {school.organization.members.length} member
                {school.organization.members.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {school.organization.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {member.user.image ? (
                      <Image
                        src={member.user.image}
                        alt={member.user.name}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {member.user.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      member.role === "OWNER"
                        ? "default"
                        : member.role === "ADMIN"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
