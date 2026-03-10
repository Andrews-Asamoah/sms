// app/(school)/[schoolSlug]/guardian/fees/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertCircle, Clock, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Decimal } from "@/lib/generated/prisma/runtime/client";
import { GuardianFeesClient } from "./guardian-fees-client";

interface GuardianFeesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

const billStatusColors: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 border-amber-200",
  PARTIALLY_PAID: "bg-blue-500/10 text-blue-700 border-blue-200",
  PAID: "bg-green-500/10 text-green-700 border-green-200",
  OVERDUE: "bg-red-500/10 text-red-700 border-red-200",
  WAIVED: "bg-gray-500/10 text-gray-700 border-gray-200",
  CANCELLED: "bg-gray-500/10 text-gray-700 border-gray-200",
};

// Helper function to safely convert Decimal to number
function decimalToNumber(value: Decimal | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value.toString());
}

export default async function GuardianFeesPage({
  params,
}: GuardianFeesPageProps) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

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
              bills: {
                orderBy: {
                  createdAt: "desc",
                },
                include: {
                  items: true
                }
              },
              payments: {
                orderBy: {
                  paymentDate: "desc",
                },
                include: {
                  bill: {
                    include: {
                      feeStructure: {
                        select: { name: true },
                      },
                    },
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

  // Aggregate all bills with proper type handling
  const allBills = guardian.students.flatMap((gs) =>
    gs.student.bills.map((bill) => ({
      id: bill.id,
      billNumber: bill.billNumber,
      studentName: `${gs.student.profile.firstName} ${gs.student.profile.lastName}`,
      studentId: gs.student.studentId,
      internalStudentId: gs.student.id,
      totalAmount: decimalToNumber(bill.totalAmount),
      paidAmount: decimalToNumber(bill.paidAmount),
      balanceAmount: decimalToNumber(bill.balanceAmount),
      status: bill.status,
      issuedAt: bill.issuedAt,
      dueDate: bill.dueDate,
      notes: bill.notes,
      items: bill.items.map(item => ({
        id: item.id,
        description: item.description,
        amount: decimalToNumber(item.amount),
        quantity: item.quantity,
        totalAmount: decimalToNumber(item.totalAmount)
      }))
    })),
  );

  // Aggregate all payments
  const allPayments = guardian.students.flatMap((gs) =>
    gs.student.payments.map((payment) => ({
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      studentName: `${gs.student.profile.firstName} ${gs.student.profile.lastName}`,
      amount: decimalToNumber(payment.amount),
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      billNumber: payment.bill?.billNumber,
      feeName: payment.bill?.feeStructure?.name,
    })),
  );

  const pendingBills = allBills.filter(
    (b) => b.status === "PENDING" || b.status === "PARTIALLY_PAID",
  );
  const overdueBills = allBills.filter((b) => b.status === "OVERDUE");
  const paidBills = allBills.filter((b) => b.status === "PAID");

  const totalOutstanding = allBills
    .filter((b) => b.status !== "PAID" && b.status !== "CANCELLED")
    .reduce((sum, bill) => sum + bill.balanceAmount, 0);

  const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fees & Payments</h1>
        <p className="text-muted-foreground mt-1">
          Manage fees and view payment history for all your children
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Outstanding
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {school.currency} {totalOutstanding.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {pendingBills.length + overdueBills.length} bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueBills.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {pendingBills.length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {school.currency} {totalPaid.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <GuardianFeesClient 
        allBills={allBills}
        allPayments={allPayments}
        currency={school.currency}
        schoolSlug={schoolSlug}
      />
    </div>
  );
}


