"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { columns, Exam } from "@/components/school/examinations/columns";

interface ExamsClientProps {
  data: Exam[];
  schoolSlug: string;
  gradingSystems: Array<{ id: string; name: string }>;
  classes: Array<{ id: string; name: string }>;
}

export function ExamsClient({
  data,
  schoolSlug,
  gradingSystems,
  classes,
}: ExamsClientProps) {
  return (
    <DataTable
      columns={columns(schoolSlug, gradingSystems, classes)}
      data={data}
      searchKey="name"
    />
  );
}
