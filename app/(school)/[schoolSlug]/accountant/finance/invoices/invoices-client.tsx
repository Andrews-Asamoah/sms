"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, Receipt } from "lucide-react";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { GenerateInvoiceDialog } from "./generate-invoice-dialog";

type Invoice = {
  id: string;
  billNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  dueDate: string;
  createdAt: string;
  student: {
    profile: { firstName: string; lastName: string };
    class?: { name: string };
  };
  feeStructure?: { name: string };
};

export function InvoicesClient() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${schoolSlug}/finance/invoices`);
      const data = await res.json();
      setInvoices(data || []);
    } catch (error) {
      console.error("Failed to fetch invoices", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [schoolSlug]);

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "billNumber",
      header: "Invoice #",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.billNumber}</span>
      ),
    },
    {
      accessorKey: "student",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            {row.original.student.profile.firstName}{" "}
            {row.original.student.profile.lastName}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.student.class?.name}
          </p>
        </div>
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
      cell: ({ row }) =>
        `$${Number(row.original.totalAmount).toLocaleString()}`,
    },
    {
      accessorKey: "balanceAmount",
      header: "Balance",
      cell: ({ row }) => (
        <span
          className={
            row.original.balanceAmount > 0
              ? "text-red-600 font-medium"
              : "text-green-600 font-medium"
          }
        >
          ${Number(row.original.balanceAmount).toLocaleString()}
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

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Invoices"
        description="Manage generated student bills and track payment status."
      >
        <Button onClick={() => setIsGenerateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Batch Bills
        </Button>
      </DashboardPageHeader>

      <div className="bg-background rounded-md border shadow-sm p-4">
        <DataTable columns={columns} data={invoices} searchKey="billNumber" />
      </div>

      {isGenerateOpen && (
        <GenerateInvoiceDialog
          open={isGenerateOpen}
          onOpenChange={setIsGenerateOpen}
          onSuccess={fetchInvoices}
        />
      )}
    </div>
  );
}
