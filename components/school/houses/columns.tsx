// components/school/houses/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import { HouseActions } from "./house-actions";

export type House = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
  motto: string | null;
  isActive: boolean;
  houseTeacherId: string | null;
  houseTeacher: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  } | null;
  _count: {
    students: number;
    teachersInHouse: number;
  };
};

export const columns: ColumnDef<House>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="House Name" />
    ),
    cell: ({ row }) => {
      const house = row.original;
      return (
        <div className="flex items-center gap-3">
          {house.color && (
            <div
              className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: house.color }}
            />
          )}
          <div>
            <div className="font-medium">{house.name}</div>
            {house.motto && (
              <div className="text-xs text-muted-foreground italic">
                &quot;{house.motto}&quot;
              </div>
            )}
          </div>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const house = row.original;
      const searchString =
        `${house.name} ${house.code} ${house.motto || ""}`.toLowerCase();
      return searchString.includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.code}</span>
    ),
  },
  {
    accessorKey: "houseTeacher",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="House Teacher" />
    ),
    cell: ({ row }) => {
      const teacher = row.original.houseTeacher;
      if (!teacher) {
        return (
          <span className="text-muted-foreground text-sm">Not assigned</span>
        );
      }
      return (
        <div>
          <div className="font-medium">
            {teacher.profile.firstName} {teacher.profile.lastName}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "students",
    header: "Students",
    cell: ({ row }) => {
      const count = row.original._count.students;
      return (
        <div className="text-sm">
          <span className="font-semibold">{count}</span> student
          {count !== 1 ? "s" : ""}
        </div>
      );
    },
  },
  {
    accessorKey: "teachers",
    header: "Teachers",
    cell: ({ row }) => {
      const count = row.original._count.teachersInHouse;
      return (
        <div className="text-sm text-muted-foreground">
          {count} teacher{count !== 1 ? "s" : ""}
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return (
        <Badge
          variant="outline"
          className={
            isActive
              ? "bg-green-500/10 text-green-700 border-green-300"
              : "bg-gray-500/10 text-gray-700 border-gray-300"
          }
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <HouseActions house={row.original} />,
  },
];
