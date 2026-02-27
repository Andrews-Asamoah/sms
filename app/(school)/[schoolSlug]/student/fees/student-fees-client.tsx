"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Bill = {
  id: string;
  billNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  dueDate: string;
  feeStructure?: { name: string };
};

type Payment = {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  bill?: {
    billNumber: string;
    feeStructure?: { name: string };
  };
};

export function StudentFeesClient() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [billsRes, paymentsRes] = await Promise.all([
          fetch(`/api/schools/${schoolSlug}/student/finance/bills`),
          fetch(`/api/schools/${schoolSlug}/student/finance/payments`),
        ]);

        if (billsRes.ok) setBills(await billsRes.json());
        if (paymentsRes.ok) setPayments(await paymentsRes.json());
      } catch (e) {
        console.error("Failed to load student finances", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolSlug]);

  const billColumns: ColumnDef<Bill>[] = [
    {
      accessorKey: "billNumber",
      header: "Invoice #",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.billNumber}</span>
      ),
    },
    {
      accessorKey: "feeStructure",
      header: "Description",
      cell: ({ row }) => row.original.feeStructure?.name || "Custom Bill",
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          GHS {Number(row.original.totalAmount).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "balanceAmount",
      header: "Balance",
      cell: ({ row }) => (
        <span
          className={
            row.original.balanceAmount > 0
              ? "font-bold text-red-600"
              : "font-bold text-green-600"
          }
        >
          GHS {Number(row.original.balanceAmount).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => format(new Date(row.original.dueDate), "MMM d, yyyy"),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge
            variant={
              s === "PAID"
                ? "default"
                : s === "PENDING"
                  ? "secondary"
                  : s === "PARTIALLY_PAID"
                    ? "outline"
                    : "destructive"
            }
          >
            {s.replace("_", " ")}
          </Badge>
        );
      },
    },
  ];

  const paymentColumns: ColumnDef<Payment>[] = [
    {
      accessorKey: "paymentNumber",
      header: "Receipt #",
    },
    {
      accessorKey: "bill",
      header: "For",
      cell: ({ row }) =>
        row.original.bill?.feeStructure?.name ||
        row.original.bill?.billNumber ||
        "N/A",
    },
    {
      accessorKey: "amount",
      header: "Amount Paid",
      cell: ({ row }) => (
        <span className="font-bold text-green-700">
          + GHS {Number(row.original.amount).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.paymentMethod.replace("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "paymentDate",
      header: "Date",
      cell: ({ row }) => format(new Date(row.original.paymentDate), "PPP"),
    },
  ];

  const totalOutstanding = bills.reduce(
    (acc, bill) => acc + Number(bill.balanceAmount),
    0,
  );

  return (
    <div className="flex-1 space-y-6 pt-6 p-4 md:p-8">
      <DashboardPageHeader
        title="My Fees & Bills"
        description="View your invoices, outstanding balances, and payment history."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Outstanding
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              GHS {totalOutstanding.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Amount left to pay</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bills" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bills" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoices & Bills
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Payment History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bills" className="space-y-4">
          <div className="bg-background rounded-md border shadow-sm p-4">
            <DataTable
              columns={billColumns}
              data={bills}
              searchKey="billNumber"
            />
          </div>
        </TabsContent>
        <TabsContent value="payments" className="space-y-4">
          <div className="bg-background rounded-md border shadow-sm p-4">
            <DataTable
              columns={paymentColumns}
              data={payments}
              searchKey="paymentNumber"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
