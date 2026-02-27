"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

type StudentFinance = {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  outstandingBalance: number;
};

export function ClassFeesTable({ data }: { data: StudentFinance[] }) {
  const columns: ColumnDef<StudentFinance>[] = [
    {
      accessorKey: "studentId",
      header: "Student ID",
      cell: ({ row }) => (
        <span className="font-medium text-xs">{row.original.studentId}</span>
      ),
    },
    {
      id: "name",
      header: "Name",
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => (
        <span className="font-semibold">
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    {
      accessorKey: "outstandingBalance",
      header: "Outstanding Balance",
      cell: ({ row }) => (
        <span
          className={
            row.original.outstandingBalance > 0
              ? "font-bold text-red-600"
              : "font-semibold text-green-600"
          }
        >
          GHS{" "}
          {row.original.outstandingBalance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      id: "status",
      header: "Payment Status",
      cell: ({ row }) => {
        const isClear = row.original.outstandingBalance <= 0;
        return (
          <Badge variant={isClear ? "default" : "destructive"}>
            {isClear ? "Cleared" : "Defaulting"}
          </Badge>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={data} searchKey="name" />;
}
