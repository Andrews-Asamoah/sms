"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, FileText, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Ward = {
  id: string;
  firstName: string;
  lastName: string;
  outstandingBalance: number;
};

type Bill = {
  id: string;
  billNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  dueDate: string;
  feeStructure?: { name: string };
  student: { profile: { firstName: string; lastName: string } };
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
  student: { profile: { firstName: string; lastName: string } };
};

export function GuardianFeesClient() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string>("all");
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Wards First
  useEffect(() => {
    const fetchWards = async () => {
      try {
        const res = await fetch(`/api/schools/${schoolSlug}/guardian/wards`);
        if (res.ok) {
          const data = await res.json();
          setWards(data || []);
        }
      } catch (e) {
        console.error("Failed to load wards", e);
      }
    };
    fetchWards();
  }, [schoolSlug]);

  // Fetch Finances
  useEffect(() => {
    const fetchFinances = async () => {
      try {
        setLoading(true);
        const wardQuery =
          selectedWardId !== "all" ? `?studentId=${selectedWardId}` : "";

        const [billsRes, paymentsRes] = await Promise.all([
          fetch(`/api/schools/${schoolSlug}/guardian/finance${wardQuery}`),
          fetch(
            `/api/schools/${schoolSlug}/guardian/finance${wardQuery ? wardQuery + "&" : "?"}type=payments`,
          ),
        ]);

        if (billsRes.ok) setBills(await billsRes.json());
        if (paymentsRes.ok) setPayments(await paymentsRes.json());
      } catch (e) {
        console.error("Failed to load guardian finances", e);
      } finally {
        setLoading(false);
      }
    };
    fetchFinances();
  }, [schoolSlug, selectedWardId]);

  const billColumns: ColumnDef<Bill>[] = [
    {
      accessorKey: "student",
      header: "Ward",
      cell: ({ row }) => (
        <span className="font-semibold">
          {row.original.student.profile.firstName}
        </span>
      ),
    },
    {
      accessorKey: "billNumber",
      header: "Invoice #",
      cell: ({ row }) => (
        <span className="font-medium text-xs">{row.original.billNumber}</span>
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
      accessorKey: "student",
      header: "Ward",
      cell: ({ row }) => (
        <span className="font-semibold">
          {row.original.student.profile.firstName}
        </span>
      ),
    },
    {
      accessorKey: "paymentNumber",
      header: "Receipt #",
      cell: ({ row }) => (
        <span className="text-xs">{row.original.paymentNumber}</span>
      ),
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
      <div className="flex items-start justify-between">
        <DashboardPageHeader
          title="Ward's Fees"
          description="View combined or individual tuition invoices and payment history."
        />
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground mr-1" />
          <Select value={selectedWardId} onValueChange={setSelectedWardId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Ward" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Wards</SelectItem>
              {wards.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.firstName} {w.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Family Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              GHS {totalOutstanding.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Owed across filtered wards
            </p>
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
