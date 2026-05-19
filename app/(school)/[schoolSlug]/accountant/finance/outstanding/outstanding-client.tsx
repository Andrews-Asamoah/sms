"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import { RecordPaymentDialog } from "../payments/record-payment-dialog";
import { Button } from "@/components/ui/button";

export type StudentDebtor = {
  id: string;
  studentId: string; // school specific ID
  profile: {
    firstName: string;
    lastName: string;
    otherNames?: string | null;
    phone: string | null;
  };
  studentName?: string;
  class: { name: string } | null;
  outstandingBalance: number;
  status: string;
};

interface OutstandingClientProps {
  initialData: StudentDebtor[];
}

export function OutstandingClient({ initialData }: OutstandingClientProps) {
  const router = useRouter();
  const [selectedStudent, setSelectedStudent] = useState<{id: string, name: string, balance: number} | null>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);

  const handleSuccess = () => {
    router.refresh(); // Refresh the server component to pull fresh data
  };

  const columns: ColumnDef<StudentDebtor>[] = [
    {
      id: "studentName",
      accessorKey: "studentName",
      header: "Student Name",
      cell: ({ row }) => (
        <span className="font-medium text-primary">
          {row.original.studentName}
        </span>
      ),
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
      accessorKey: "profile.phone",
      header: "Contact",
      cell: ({ row }) => row.original.profile?.phone || "-",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          onClick={() => {
            setSelectedStudent({
              id: row.original.id,
              name: row.original.studentName || "Unknown",
              balance: row.original.outstandingBalance,
            });
            setIsPayOpen(true);
          }}
        >
          <Wallet className="h-3 w-3" />
          Pay
        </Button>
      ),
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

        <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="h-8 px-3 text-xs bg-red-50 text-red-600 border-red-200">
                Viewing: Current Academic Period
            </Badge>
            <span className="text-[10px] text-muted-foreground italic">
                (Controlled by sidebar switcher)
            </span>
        </div>
      </div>

      <div className="bg-background rounded-md border shadow-sm p-4">
        <DataTable 
          columns={columns} 
          data={initialData} 
          searchKey="studentName" 
          exportTitle="Outstanding Fees Report"
          exportOrientation="landscape"
        />
      </div>

      {selectedStudent && (
        <RecordPaymentDialog
          open={isPayOpen}
          onOpenChange={setIsPayOpen}
          onSuccess={handleSuccess}
          initialStudentId={selectedStudent.id}
          initialAmount={selectedStudent.balance}
        />
      )}
    </div>
  );
}
