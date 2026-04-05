"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { columns, Subject } from "@/components/school/subjects/columns";

interface SubjectsClientProps {
  data: Subject[];
  schoolSlug: string;
  departments: Array<{ id: string; name: string }>;
  teachers: Array<{ id: string; profile: { firstName: string; lastName: string } }>;
}

export function SubjectsClient({
  data,
  schoolSlug,
  departments,
  teachers,
}: SubjectsClientProps) {
  return (
    <DataTable
      columns={columns(schoolSlug, departments, teachers)}
      data={data}
      searchKey="name"
      exportTitle="Subjects List Report"
    />
  );
}
