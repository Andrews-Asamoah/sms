// components/school/houses/houses-table.tsx
"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table/data-table";
import { House, createColumns } from "./columns";

interface HousesDataTableProps {
  data: House[];
  schoolSlug: string;
  schoolId: string;
  teachers: Array<{
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  }>;
}

export function HousesDataTable({
  data,
  schoolSlug,
  schoolId,
  teachers,
}: HousesDataTableProps) {
  const columns = useMemo(
    () => createColumns({ schoolSlug, schoolId, teachers }),
    [schoolSlug, schoolId, teachers],
  );

  return <DataTable columns={columns} data={data} searchKey="name" />;
}
