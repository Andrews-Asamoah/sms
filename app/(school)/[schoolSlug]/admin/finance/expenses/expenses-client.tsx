"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { NavPermissions } from "@/lib/auth/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/school/finance/expense-form";

type Expense = {
  id: string;
  amount: number;
  date: string;
  description: string;
  payee?: string;
  paymentMethod: string;
  customCategory?: { name: string };
  recordedBy?: { name: string };
  voucherNumber?: string;
};

interface ExpensesClientProps {
  permissions: NavPermissions;
}

export default function ExpensesClient({ permissions }: ExpensesClientProps) {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;
  const [data, setData] = useState<Expense[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/finance/expenses`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolSlug]);

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => format(new Date(row.original.date), "dd MMM yyyy"),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.description}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {row.original.customCategory?.name || "Uncategorized"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "voucherNumber",
      header: "Voucher #",
      cell: ({ row }) => row.original.voucherNumber || "-",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-bold text-red-600 dark:text-red-400">
          GHS {Number(row.original.amount).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px]">
          {row.original.paymentMethod.replace("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "payee",
      header: "Payee",
      cell: ({ row }) => row.original.payee || "-",
    },
    {
      header: "Recorded By",
      cell: ({ row }) => row.original.recordedBy?.name || "System",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage school expenditures and operational costs
          </p>
        </div>
        {permissions.canManageFinance && (
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="w-full md:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Record Expense
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Total Expenses (Current Month)
          </p>
          <h3 className="text-2xl font-bold mt-1">
            GHS{" "}
            {data
              .reduce((sum, item) => sum + Number(item.amount), 0)
              .toFixed(2)}
          </h3>
        </div>
        {/* Add more summary cards if needed */}
      </div>

      <DataTable columns={columns} data={data} searchKey="description" loading={loading} exportTitle="Expenses Report" />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Record New Expense</DialogTitle>
            <DialogDescription>
              Enter the details of the expenditure. All fields marked with * are
              required.
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            schoolSlug={schoolSlug}
            onSuccess={() => {
              fetchData();
              setIsDialogOpen(false);
            }}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
