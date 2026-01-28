// components/school/students/students-data-table.tsx
"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { Student } from "./columns";
import { ColumnDef } from "@tanstack/react-table";

interface StudentsDataTableProps {
  columns: ColumnDef<Student>[];
  data: Student[];
  schoolSlug: string;
}

export function StudentsDataTable({
  columns,
  data,
  schoolSlug,
}: StudentsDataTableProps) {
  return <DataTable columns={columns} data={data} searchKey="student" />;
}
