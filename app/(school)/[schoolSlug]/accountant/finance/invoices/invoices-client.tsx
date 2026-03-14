"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, Printer } from "lucide-react";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { BatchPrintDialog } from "./batch-print-dialog";
import { formatStudentName } from "@/lib/utils/name-formatter";
import Link from "next/link";

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
    profile: {
      firstName: string;
      lastName: string;
      otherNames?: string | null;
    };
    class?: { name: string };
  };
  studentName?: string;
  feeStructure?: { name: string };
};

export function InvoicesClient() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${schoolSlug}/finance/invoices`);
      const data = await res.json();
      const mappedData = (data || []).map((inv: any) => ({
        ...inv,
        studentName: inv.student?.profile
          ? formatStudentName(
              inv.student.profile.firstName,
              inv.student.profile.lastName,
              inv.student.profile.otherNames,
            )
          : "Unknown",
      }));
      setInvoices(mappedData);
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
      id: "studentName",
      accessorKey: "studentName",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.studentName}</p>
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPrintOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Print Class Invoices
          </Button>
          <Link href={`/${schoolSlug}/accountant/finance/invoices/generate`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate Batch Bills
            </Button>
          </Link>
        </div>
      </DashboardPageHeader>

      <div className="flex items-center gap-2 bg-muted/30 p-2 px-4 rounded-lg w-fit">
        <Badge
          variant="outline"
          className="bg-primary/5 text-primary border-primary/20"
        >
          Viewing: Selected Academic Period
        </Badge>
        <span className="text-xs text-muted-foreground italic">
          Controlled by sidebar switcher
        </span>
      </div>

      <div className="bg-background rounded-md border shadow-sm p-4">
        <DataTable
          columns={columns}
          data={invoices}
          searchKey="studentName"
          exportTitle="Invoices Report"
          exportOrientation="landscape"
        />
      </div>

      {isPrintOpen && (
        <BatchPrintDialog open={isPrintOpen} onOpenChange={setIsPrintOpen} />
      )}
    </div>
  );
}
