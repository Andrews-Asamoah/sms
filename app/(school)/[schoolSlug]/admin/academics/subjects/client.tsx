"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { columns, Subject } from "@/components/school/subjects/columns";

interface SubjectsClientProps {
  data: Subject[];
  schoolSlug: string;
  departments: Array<{ id: string; name: string }>;
}

export function SubjectsClient({
  data,
  schoolSlug,
  departments,
}: SubjectsClientProps) {
  return (
    <DataTable
      columns={columns(schoolSlug, departments)}
      data={data}
      searchKey="name"
      exportTitle="Subjects List Report"
    />
  );
}
