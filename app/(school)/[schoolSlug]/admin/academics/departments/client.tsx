"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { columns, Department } from "@/components/school/departments/columns";

interface DepartmentsClientProps {
  data: Department[];
  schoolSlug: string;
}

export function DepartmentsClient({
  data,
  schoolSlug,
}: DepartmentsClientProps) {
  return (
    <DataTable columns={columns(schoolSlug)} data={data} searchKey="name" exportTitle="Departments List Report" />
  );
}
