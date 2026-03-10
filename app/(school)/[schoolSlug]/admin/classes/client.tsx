"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { columns, ClassItem } from "@/components/school/classes/columns";

interface ClassesClientProps {
  data: ClassItem[];
  schoolSlug: string;
}

export function ClassesClient({ data, schoolSlug }: ClassesClientProps) {
  return (
    <DataTable columns={columns(schoolSlug)} data={data} searchKey="name" exportTitle="Class List Report" />
  );
}
