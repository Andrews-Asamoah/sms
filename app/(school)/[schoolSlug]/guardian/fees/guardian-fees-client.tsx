"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

const billStatusColors: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 border-amber-200",
  PARTIALLY_PAID: "bg-blue-500/10 text-blue-700 border-blue-200",
  PAID: "bg-green-500/10 text-green-700 border-green-200",
  OVERDUE: "bg-red-500/10 text-red-700 border-red-200",
  WAIVED: "bg-gray-500/10 text-gray-700 border-gray-200",
  CANCELLED: "bg-gray-500/10 text-gray-700 border-gray-200",
};

interface Bill {
  id: string;
  billNumber: string;
  studentName: string;
  studentId: string;
  internalStudentId: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  issuedAt: Date;
  dueDate: Date | null;
  notes?: string | null;
  items?: {
    id: string;
    description: string;
    amount: number;
    quantity: number;
    totalAmount: number;
  }[];
}

interface Payment {
  id: string;
  paymentNumber: string;
  studentName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  billNumber?: string;
  feeName?: string;
}

interface GuardianFeesClientProps {
  allBills: Bill[];
  allPayments: Payment[];
  currency: string;
  schoolSlug: string;
}

export function GuardianFeesClient({
  allBills,
  allPayments,
  currency,
  schoolSlug,
}: GuardianFeesClientProps) {
  const pendingBills = allBills.filter(
    (b) => b.status === "PENDING" || b.status === "PARTIALLY_PAID"
  );
  const overdueBills = allBills.filter((b) => b.status === "OVERDUE");
  const paidBills = allBills.filter((b) => b.status === "PAID");

  const router = useRouter();

  const handlePayClick = (bill: Bill) => {
    router.push(`/${schoolSlug}/guardian/fees/pay/${bill.id}`);
  };

  const handlePaymentSuccess = () => {
    // Refresh the page to reflect the new payment
    window.location.reload();
  };

  return (
    <>
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
              <TabsTrigger value="all">All Bills ({allBills.length})</TabsTrigger>
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
              <BillsTable bills={allBills} currency={currency} onPay={handlePayClick} />
            </TabsContent>

            <TabsContent value="overdue" className="mt-4">
              <BillsTable bills={overdueBills} currency={currency} onPay={handlePayClick} />
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              <BillsTable bills={pendingBills} currency={currency} onPay={handlePayClick} />
            </TabsContent>

            <TabsContent value="paid" className="mt-4">
              <BillsTable bills={paidBills} currency={currency} onPay={handlePayClick} />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <PaymentsTable payments={allPayments} currency={currency} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Online Payment Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Online Payments Available</h4>
              <p className="text-sm text-blue-800 mt-1">
                You can now securely pay your ward's fees online using Paystack. 
                Click the "Pay Now" button next to any pending bill to get started. 
                Receipts will be generated instantly in your portal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Bills Table Component
function BillsTable({
  bills,
  currency,
  onPay,
}: {
  bills: Bill[];
  currency: string;
  onPay: (bill: Bill) => void;
}) {
  if (bills.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No bills found</p>;
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
          <TableHead className="text-right">Action</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bills.map((bill) => <BillRow key={bill.id} bill={bill} currency={currency} onPay={onPay} />)}
      </TableBody>
    </Table>
  );
}

function BillRow({
  bill,
  currency,
  onPay,
}: {
  bill: Bill;
  currency: string;
  onPay: (bill: Bill) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPayable = ["PENDING", "PARTIALLY_PAID", "OVERDUE"].includes(bill.status);

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setIsExpanded(!isExpanded)}>
        <TableCell className="font-medium">{bill.billNumber}</TableCell>
        <TableCell>
          <div>
            <p className="font-medium">{bill.studentName}</p>
            <p className="text-xs text-muted-foreground">{bill.studentId}</p>
          </div>
        </TableCell>
        <TableCell>{new Date(bill.issuedAt).toLocaleDateString()}</TableCell>
        <TableCell>
          {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : "-"}
        </TableCell>
        <TableCell className="font-semibold text-primary">
          {currency} {bill.totalAmount.toFixed(2)}
        </TableCell>
        <TableCell className="text-green-600">
          {currency} {bill.paidAmount.toFixed(2)}
        </TableCell>
        <TableCell className="font-bold text-destructive">
          {currency} {bill.balanceAmount.toFixed(2)}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={billStatusColors[bill.status]}>
            {bill.status}
          </Badge>
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          {isPayable && (
            <Button 
              size="sm" 
              onClick={() => onPay(bill)}
              className="bg-primary hover:bg-primary/90"
            >
              Pay Now
            </Button>
          )}
        </TableCell>
        <TableCell>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </TableCell>
      </TableRow>
      {isExpanded && bill.items && bill.items.length > 0 && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={10} className="p-0">
            <div className="p-4 rounded-md border m-2 bg-background shadow-inner">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Bill Breakdown (Bill #{bill.billNumber})
              </h4>
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent hover:bg-transparent">
                    <TableHead className="h-8 py-0">Description</TableHead>
                    <TableHead className="h-8 py-0">Qty</TableHead>
                    <TableHead className="h-8 py-0 text-right">Unit Price</TableHead>
                    <TableHead className="h-8 py-0 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bill.items.map((item) => (
                    <TableRow key={item.id} className="bg-transparent hover:bg-transparent border-b-muted">
                      <TableCell className="py-2">{item.description}</TableCell>
                      <TableCell className="py-2">{item.quantity}</TableCell>
                      <TableCell className="py-2 text-right">
                        {currency} {item.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="py-2 text-right font-medium">
                        {currency} {(item.amount * item.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-transparent hover:bg-transparent border-t-2 font-bold">
                    <TableCell colSpan={3} className="py-4 text-right">GRAND TOTAL</TableCell>
                    <TableCell className="py-4 text-right text-primary">
                      {currency} {bill.totalAmount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {bill.notes && (
                <div className="mt-4 p-3 bg-amber-50/50 border border-amber-100 rounded text-sm italic text-amber-900/80">
                  <span className="font-bold block not-italic mb-1 text-amber-900">Note:</span>
                  {bill.notes}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// Payments Table Component
function PaymentsTable({
  payments,
  currency,
}: {
  payments: Payment[];
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
            <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
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
