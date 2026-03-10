"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface StudentData {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  className: string;
  outstandingBalance: number;
  status: string;
}

export const columns: ColumnDef<StudentData>[] = [
  {
    accessorKey: "studentId",
    header: "ID",
  },
  {
    accessorKey: "fullName",
    header: "Name",
    cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
  },
  {
    accessorKey: "className",
    header: "Class",
  },
  {
    accessorKey: "outstandingBalance",
    header: "Outstanding Balance",
    cell: ({ row }) => (
      <span className={row.original.outstandingBalance > 0 ? "text-destructive font-semibold" : "text-green-600"}>
        {formatCurrency(row.original.outstandingBalance)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "ACTIVE" ? "default" : "secondary"}>
        {row.original.status}
      </Badge>
    ),
  },
];

interface StudentsClientProps {
  data: StudentData[];
}

export function StudentsClient({ data }: StudentsClientProps) {
  const [selectedClass, setSelectedClass] = useState<string>("all");

  const classOptions = useMemo(() => {
    const names = Array.from(new Set(data.map((s) => s.className))).sort();
    return names;
  }, [data]);

  const filtered = useMemo(() => {
    if (selectedClass === "all") return data;
    return data.filter((s) => s.className === selectedClass);
  }, [data, selectedClass]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classOptions.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchKey="fullName"
      />
    </div>
  );
}
