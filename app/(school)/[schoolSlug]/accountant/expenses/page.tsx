"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, TrendingDown, Filter } from "lucide-react";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AddExpenseDialog } from "./components/add-expense-dialog";

type Expense = {
  id: string;
  date: string;
  amount: number;
  description: string;
  payee: string | null;
  paymentMethod: string;
  checkNumber: string | null;
  voucherNumber: string | null;
  category: string | null;
  recordedBy: { name: string } | null;
};

export default function ExpensesPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${schoolSlug}/finance/expenses`);
      const data = await res.json();
      setExpenses(data || []);
    } catch (error) {
      console.error("Failed to fetch expenses", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [schoolSlug]);

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => format(new Date(row.original.date), "MMM d, yyyy"),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.description}</span>
          {row.original.payee && (
            <span className="text-xs text-muted-foreground">
              To: {row.original.payee}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => row.original.category?.replace("_", " ") || "General",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-bold text-red-600">
          -GH₵{Number(row.original.amount).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "voucherNumber",
      header: "POV #",
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Badge variant="outline" className="w-fit">
            {row.original.paymentMethod}
          </Badge>
          {row.original.checkNumber && (
            <span className="text-[10px] text-muted-foreground">
              Chq: {row.original.checkNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm">
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Expenditure Tracking"
        description="Monitor and record school expenses, payments, and outgoings."
      >
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Expense
          </Button>
        </div>
      </DashboardPageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-background rounded-md border shadow-sm p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Total Expenses (Month)
          </p>
          <h3 className="text-2xl font-bold mt-1">
            GH₵
            {expenses
              .reduce((sum, e) => sum + Number(e.amount), 0)
              .toLocaleString()}
          </h3>
          <p className="text-xs text-red-600 mt-1 flex items-center">
            <TrendingDown className="h-3 w-3 mr-1" />
            12% increase from last month
          </p>
        </div>
        {/* Additional stat cards can go here */}
      </div>

      <div className="bg-background rounded-md border shadow-sm p-4">
        <DataTable columns={columns} data={expenses} searchKey="description" />
      </div>

      {isAddOpen && (
        <AddExpenseDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onSuccess={fetchExpenses}
        />
      )}
    </div>
  );
}
