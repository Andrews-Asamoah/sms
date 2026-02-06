// components/school/houses/houses-table.tsx
"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { House } from "./columns";
import { ColumnDef } from "@tanstack/react-table";

interface HousesDataTableProps {
  columns: ColumnDef<House>[];
  data: House[];
  schoolSlug: string;
  teachers: Array<{
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  }>;
}

export function HousesDataTable({ columns, data }: HousesDataTableProps) {
  return <DataTable columns={columns} data={data} searchKey="name" />;
}
