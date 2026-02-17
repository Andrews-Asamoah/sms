"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";

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
      otherNames?: string;
    };
  };
  recordedBy: {
    name: string;
  };
};

export default function PaymentsPage() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;
  const [data, setData] = useState<Payment[]>([]);

  useEffect(() => {
    // Fetch Payments
    // We need an API for this: api/schools/[schoolSlug]/finance/payments
    // I'll create the API next.
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
        return `${p.firstName} ${p.lastName}`; // Simplified
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
      header: "Recorded By",
      accessorFn: (row) => row.recordedBy.name,
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      <DataTable columns={columns} data={data} searchKey="paymentNumber" />
    </div>
  );
}
