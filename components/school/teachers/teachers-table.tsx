// components/school/teachers/teachers-table.tsx
"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";

interface TeachersDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  schoolSlug: string;
  departments: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  houses: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

export function TeachersDataTable<TData, TValue>({
  columns,
  data,
  schoolSlug,
  departments,
  houses,
}: TeachersDataTableProps<TData, TValue>) {
  return <DataTable columns={columns} data={data} searchKey="teacher" />;
}
