// app/(school)/[schoolSlug]/parent/dashboard/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  DollarSign,
  AlertCircle,
  Calendar,
  TrendingUp,
  ArrowRight,
  Bell,
  FileText,
  GraduationCap,
} from "lucide-react";
import { Decimal } from "@/lib/generated/prisma/runtime/client";

interface ParentDashboardProps {
  params: Promise<{ schoolSlug: string }>;
}

// Helper function to safely convert Decimal to number
function decimalToNumber(value: Decimal | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value.toString());
}

export default async function ParentDashboard({
  params,
}: ParentDashboardProps) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  // Get guardian with all related data
  const guardian = await prisma.guardian.findFirst({
    where: {
      schoolId: school.id,
      profile: {
        userId: session.user.id,
      },
    },
    include: {
      students: {
        include: {
          student: {
            include: {
              profile: true,
              class: {
                include: {
                  academicYear: true,
                },
              },
              bills: {
                where: {
                  status: {
                    in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"],
                  },
                },
              },
              attendances: {
                where: {
                  date: {
                    gte: new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      1,
                    ),
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!guardian) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Calculate stats
  const totalChildren = guardian.students.length;

  const totalOutstanding = guardian.students.reduce((total, gs) => {
    return (
      total +
      gs.student.bills.reduce((sum, bill) => {
        return sum + decimalToNumber(bill.balanceAmount);
      }, 0)
    );
  }, 0);

  const totalPendingBills = guardian.students.reduce(
    (total, gs) => total + gs.student.bills.length,
    0,
  );

  // Get recent activities (simplified for now)
  const recentActivities = guardian.students.flatMap((gs) =>
    gs.student.attendances.slice(0, 5).map((att) => ({
      id: att.id,
      studentName: `${gs.student.profile.firstName} ${gs.student.profile.lastName}`,
      type: "attendance",
      status: att.status,
      date: att.date,
    })),
  );

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {guardian.firstName}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your {totalChildren}{" "}
          {totalChildren === 1 ? "child's" : "children's"} progress
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChildren}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {school.currency} {totalOutstanding.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalPendingBills} pending bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPendingBills > 0 ? totalPendingBills : 0}
            </div>
            <p className="text-xs text-muted-foreground">Pending items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentActivities.length}</div>
            <p className="text-xs text-muted-foreground">Recent activities</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Children Quick View */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              My Children
            </CardTitle>
            <CardDescription>Quick overview of your children</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {guardian.students.map((gs) => {
              const student = gs.student;
              const initials =
                `${student.profile.firstName.charAt(0)}${student.profile.lastName.charAt(0)}`.toUpperCase();
              const pendingBills = student.bills.length;

              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {student.profile.firstName} {student.profile.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.class?.name || "No class assigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingBills > 0 && (
                      <Badge variant="destructive">{pendingBills} bills</Badge>
                    )}
                    <Link href={`/${schoolSlug}/parent/children/${student.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}

            <Link href={`/${schoolSlug}/parent/children`}>
              <Button className="w-full" variant="outline">
                View All Children
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Pending Bills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pending Bills
            </CardTitle>
            <CardDescription>Outstanding payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalPendingBills === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="mx-auto h-12 w-12 mb-2 opacity-20" />
                <p>No pending bills</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {guardian.students.slice(0, 3).flatMap((gs) =>
                    gs.student.bills.slice(0, 2).map((bill) => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">{bill.billNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {gs.student.profile.firstName}{" "}
                            {gs.student.profile.lastName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {school.currency}{" "}
                            {decimalToNumber(bill.balanceAmount).toFixed(2)}
                          </p>
                          <Badge
                            variant={
                              bill.status === "OVERDUE"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {bill.status}
                          </Badge>
                        </div>
                      </div>
                    )),
                  )}
                </div>

                <Link href={`/${schoolSlug}/parent/bills`}>
                  <Button className="w-full" variant="outline">
                    View All Bills
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and important links</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href={`/${schoolSlug}/parent/bills`}>
              <Button
                className="w-full h-auto flex-col gap-2 p-4"
                variant="outline"
              >
                <DollarSign className="h-8 w-8" />
                <span>View Bills</span>
              </Button>
            </Link>

            <Link href={`/${schoolSlug}/parent/children`}>
              <Button
                className="w-full h-auto flex-col gap-2 p-4"
                variant="outline"
              >
                <Users className="h-8 w-8" />
                <span>My Children</span>
              </Button>
            </Link>

            <Link href={`/${schoolSlug}/parent/communications`}>
              <Button
                className="w-full h-auto flex-col gap-2 p-4"
                variant="outline"
              >
                <Bell className="h-8 w-8" />
                <span>Messages</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      {totalPendingBills > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900">
                  Payment Reminder
                </h4>
                <p className="text-sm text-amber-800 mt-1">
                  You have {totalPendingBills} pending{" "}
                  {totalPendingBills === 1 ? "bill" : "bills"} totaling{" "}
                  {school.currency} {totalOutstanding.toFixed(2)}. Please
                  contact the accounts office to make payment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
