"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Wallet } from "lucide-react";
import { format } from "date-fns";
import { NavPermissions } from "@/lib/auth/types";
import { RecordPaymentSheet } from "@/components/school/finance/record-payment-sheet";

type Payment = {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  student: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      otherNames?: string;
    };
  };
  recordedBy: {
    name: string;
  };
};

interface PaymentsClientProps {
  permissions: NavPermissions;
}

export default function PaymentsClient({ permissions }: PaymentsClientProps) {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;
  const [data, setData] = useState<Payment[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/finance/payments`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolSlug]);

  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: "paymentNumber",
      header: "Receipt #",
    },
    {
      accessorKey: "student",
      header: "Student",
      cell: ({ row }) => {
        const p = row.original.student.profile;
        return `${p.firstName} ${p.lastName}`;
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-bold">
          GHS {Number(row.original.amount).toFixed(2)}
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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) =>
        permissions.canManageFinance ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8"
            onClick={() =>
              setSelectedStudent({
                id: row.original.student.id,
                name: `${row.original.student.profile.firstName} ${row.original.student.profile.lastName}`,
              })
            }
          >
            <Wallet className="h-4 w-4 mr-1" />
            Top-up
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Transaction history and revenue records
          </p>
        </div>
        <Button onClick={() => setSelectedStudent({ id: "", name: "" })}>
          <Plus className="mr-2 h-4 w-4" /> Record Payment
        </Button>
      </div>

      <DataTable columns={columns} data={data} searchKey="paymentNumber" exportTitle="Payments Report" />

      {selectedStudent && (
        <RecordPaymentSheet
          open={!!selectedStudent}
          onOpenChange={(open) => !open && setSelectedStudent(null)}
          studentId={selectedStudent.id || undefined}
          studentName={selectedStudent.name || undefined}
          schoolSlug={schoolSlug}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
