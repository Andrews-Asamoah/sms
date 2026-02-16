"use client";

import { TeachersDataTable } from "@/components/school/teachers/teachers-table";
import { columns, Teacher } from "@/components/school/teachers/columns";

interface TeachersClientProps {
  data: Teacher[];
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

export function TeachersClient({
  data,
  schoolSlug,
  departments,
  houses,
}: TeachersClientProps) {
  return (
    <TeachersDataTable
      columns={columns}
      data={data}
      schoolSlug={schoolSlug}
      departments={departments}
      houses={houses}
    />
  );
}
