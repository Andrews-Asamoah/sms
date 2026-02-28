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
      totalAmount: decimalToNumber(bill.totalAmount),
      paidAmount: decimalToNumber(bill.paidAmount),
      balanceAmount: decimalToNumber(bill.balanceAmount),
      status: bill.status,
      issuedAt: bill.issuedAt,
      dueDate: bill.dueDate,
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

      {/* Bills Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Records</CardTitle>
          <CardDescription>
            View and track bills and payments for all your children
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All Bills ({allBills.length})
              </TabsTrigger>
              <TabsTrigger value="overdue">
                Overdue ({overdueBills.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingBills.length})
              </TabsTrigger>
              <TabsTrigger value="paid">Paid ({paidBills.length})</TabsTrigger>
              <TabsTrigger value="history" className="bg-primary/5">
                Payment History ({allPayments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <BillsTable bills={allBills} currency={school.currency} />
            </TabsContent>

            <TabsContent value="overdue" className="mt-4">
              <BillsTable bills={overdueBills} currency={school.currency} />
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              <BillsTable bills={pendingBills} currency={school.currency} />
            </TabsContent>

            <TabsContent value="paid" className="mt-4">
              <BillsTable bills={paidBills} currency={school.currency} />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <PaymentsTable
                payments={allPayments}
                currency={school.currency}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Payment Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">
                Payment Information
              </h4>
              <p className="text-sm text-blue-800 mt-1">
                To make a payment, please contact the school administration or
                visit the accounts office. Payment receipts will be updated
                automatically in your portal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Bills Table Component
function BillsTable({
  bills,
  currency,
}: {
  bills: Array<{
    id: string;
    billNumber: string;
    studentName: string;
    studentId: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    issuedAt: Date;
    dueDate: Date | null;
  }>;
  currency: string;
}) {
  if (bills.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No bills found</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bill Number</TableHead>
          <TableHead>Student</TableHead>
          <TableHead>Issue Date</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Total Amount</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bills.map((bill) => (
          <TableRow key={bill.id}>
            <TableCell className="font-medium">{bill.billNumber}</TableCell>
            <TableCell>
              <div>
                <p className="font-medium">{bill.studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {bill.studentId}
                </p>
              </div>
            </TableCell>
            <TableCell>
              {new Date(bill.issuedAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : "-"}
            </TableCell>
            <TableCell>
              {currency} {bill.totalAmount.toFixed(2)}
            </TableCell>
            <TableCell>
              {currency} {bill.paidAmount.toFixed(2)}
            </TableCell>
            <TableCell className="font-semibold">
              {currency} {bill.balanceAmount.toFixed(2)}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={billStatusColors[bill.status]}
              >
                {bill.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Payments Table Component
function PaymentsTable({
  payments,
  currency,
}: {
  payments: Array<{
    id: string;
    paymentNumber: string;
    studentName: string;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
    billNumber?: string;
    feeName?: string;
  }>;
  currency: string;
}) {
  if (payments.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No payment history found
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Receipt #</TableHead>
          <TableHead>Student</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>For</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-medium">
              {payment.paymentNumber}
            </TableCell>
            <TableCell>{payment.studentName}</TableCell>
            <TableCell>
              {new Date(payment.paymentDate).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div>
                <p className="text-sm font-medium">
                  {payment.feeName || "Custom Payment"}
                </p>
                {payment.billNumber && (
                  <p className="text-xs text-muted-foreground">
                    Bill: {payment.billNumber}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {payment.paymentMethod.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-bold text-green-600">
              {currency} {payment.amount.toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
