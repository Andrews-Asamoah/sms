"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, TrendingDown } from "lucide-react";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AddExpenseDialog } from "./components/add-expense-dialog";
import { ExpenseDetailsDialog } from "./components/expense-details-dialog";

export type Expense = {
  id: string;
  date: string | Date;
  amount: number | string | any;
  description: string;
  payee: string | null;
  paymentMethod: string;
  checkNumber: string | null;
  referenceNumber?: string | null;
  voucherNumber: string | null;
  category?: string | null;
  recordedBy: { name: string } | null;
};

interface ExpensesClientProps {
  initialExpenses: Expense[];
}

export function ExpensesClient({ initialExpenses }: ExpensesClientProps) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleSuccess = () => {
    router.refresh(); // Refresh the server component to pull fresh data
  };

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
          {(row.original.checkNumber || row.original.referenceNumber) && (
            <span className="text-[10px] text-muted-foreground">
              Ref: {row.original.checkNumber || row.original.referenceNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            setSelectedExpense(row.original);
            setIsDetailsOpen(true);
          }}
        >
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
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Expense
          </Button>
        </div>
      </DashboardPageHeader>

      <div className="flex items-center gap-2 bg-muted/30 p-2 px-4 rounded-lg w-fit">
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
          Viewing: Selected Academic Period
        </Badge>
        <span className="text-xs text-muted-foreground italic">
          Controlled by sidebar switcher
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-background rounded-md border shadow-sm p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Total Expenses (Selected Period)
          </p>
          <h3 className="text-2xl font-bold mt-1">
            GH₵
            {initialExpenses
              .reduce((sum, e) => sum + Number(e.amount), 0)
              .toLocaleString()}
          </h3>
        </div>
      </div>

      <div className="bg-background rounded-md border shadow-sm p-4">
        <DataTable 
          columns={columns} 
          data={initialExpenses} 
          searchKey="description" 
          exportTitle="Expenses Report"
        />
      </div>

      {isAddOpen && (
        <AddExpenseDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onSuccess={handleSuccess}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailsDialog
          expense={selectedExpense}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
        />
      )}
    </div>
  );
}
