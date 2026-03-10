"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import { NavPermissions } from "@/lib/auth/types";
import { RecordPaymentSheet } from "@/components/school/finance/record-payment-sheet";

type StudentDebtor = {
  id: string;
  studentId: string; // school specific ID
  profile: {
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  class: { name: string } | null;
  outstandingBalance: number;
  status: string;
};

interface OutstandingFeesClientProps {
  permissions: NavPermissions;
}

export default function OutstandingFeesClient({
  permissions,
}: OutstandingFeesClientProps) {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;
  const [data, setData] = useState<StudentDebtor[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/finance/students/outstanding`,
      );
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

  const columns: ColumnDef<StudentDebtor>[] = [
    {
      accessorKey: "profile",
      header: "Student Name",
      cell: ({ row }) =>
        `${row.original.profile.firstName} ${row.original.profile.lastName}`,
    },
    {
      accessorKey: "studentId",
      header: "ID",
    },
    {
      accessorKey: "class",
      header: "Class",
      cell: ({ row }) => row.original.class?.name || "N/A",
    },
    {
      accessorKey: "outstandingBalance",
      header: "Amount Owning (GHS)",
      cell: ({ row }) => (
        <div className="font-bold text-red-600">
          {Number(row.original.outstandingBalance).toFixed(2)}
        </div>
      ),
    },
    {
      header: "Contact",
      cell: ({ row }) => row.original.profile.phone || "-",
    },
    {
      id: "actions",
      cell: ({ row }) =>
        permissions.canManageFinance ? (
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-slate-100"
            onClick={() =>
              setSelectedStudent({
                id: row.original.id,
                name: `${row.original.profile.firstName} ${row.original.profile.lastName}`,
              })
            }
          >
            <Wallet className="mr-1 h-3 w-3" />
            Pay
          </Badge>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-red-600">
            Outstanding Fees
          </h1>
          <p className="text-muted-foreground">Students with unpaid balances</p>
        </div>
      </div>

      <DataTable columns={columns} data={data} searchKey="studentId" exportTitle="Outstanding Fees Report" />

      {selectedStudent && (
        <RecordPaymentSheet
          open={!!selectedStudent}
          onOpenChange={(open) => !open && setSelectedStudent(null)}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          schoolSlug={schoolSlug}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
