"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { columns, GradingSystem } from "@/components/school/grading/columns";

interface GradingSystemsClientProps {
  data: GradingSystem[];
  schoolSlug: string;
}

export function GradingSystemsClient({
  data,
  schoolSlug,
}: GradingSystemsClientProps) {
  return (
    <DataTable columns={columns(schoolSlug)} data={data} searchKey="name" />
  );
}
