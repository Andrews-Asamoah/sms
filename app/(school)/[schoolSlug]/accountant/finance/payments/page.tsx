"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { formatStudentName } from "@/lib/utils/name-formatter";

type Payment = {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  student: {
    profile: {
      firstName: string;
      lastName: string;
      otherNames?: string | null;
    };
  };
  studentName?: string;
  bill?: {
    billNumber: string;
    feeStructure?: { name: string };
  };
};

export default function PaymentsPage() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;
  const [data, setData] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${schoolSlug}/finance/payments`);
      if (res.ok) {
        const json = await res.json();
        const mappedData = (json || []).map((p: any) => ({
          ...p,
          studentName: p.student?.profile 
            ? formatStudentName(
                p.student.profile.firstName,
                p.student.profile.lastName,
                p.student.profile.otherNames
              )
            : "Unknown"
        }));
        setData(mappedData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [schoolSlug]);

  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: "paymentNumber",
      header: "Receipt #",
    },
    {
      id: "studentName",
      accessorKey: "studentName",
      header: "Student",
      cell: ({ row }) => {
        return row.original.studentName || "-";
      },
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
      header: "Amount",
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

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Payments"
        description="Transaction history and incoming revenue records."
      >
        <Button onClick={() => setIsRecordOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </DashboardPageHeader>

      <div className="flex items-center gap-2 bg-muted/30 p-2 px-4 rounded-lg w-fit">
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
          Viewing: Selected Academic Period
        </Badge>
        <span className="text-xs text-muted-foreground italic">
          Controlled by sidebar switcher
        </span>
      </div>

      <div className="bg-background rounded-md border shadow-sm p-4">
        <DataTable 
          columns={columns} 
          data={data} 
          searchKey="studentName" 
          exportTitle="Payments Report"
          exportOrientation="landscape"
        />
      </div>

      {isRecordOpen && (
        <RecordPaymentDialog
          open={isRecordOpen}
          onOpenChange={setIsRecordOpen}
          onSuccess={fetchPayments}
        />
      )}
    </div>
  );
}
