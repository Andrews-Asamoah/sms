"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";

import CellAction from "./cellAction";

export type UsersColumn = {
  id: string;
  firstName: string | null;
  otherNames: string | null;
  lastName: string | null;
  email: string | null;
  username: string | null;
  phone: string | null;
  role: string;
  image: string | null;
  createdAt: string;
};

export const columns: ColumnDef<UsersColumn>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "firstName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Firstname" />
    ),
    cell: ({ row }) => (
      <div className="w-[80px]">{row.getValue("firstName")}</div>
    ),
  },
  {
    accessorKey: "otherNames",
    header: "Othername",
  },
  {
    accessorKey: "lastName",
    header: "Lastname",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Contact",
  },
  {
    accessorKey: "image",
    header: "Image",
  },
  {
    accessorKey: "createdAt",
    header: "Date Joined",
  },
  // {
  //   accessorKey: "salary",
  //   header: () => <div className="text-right">Salary</div>,
  //   cell: ({ row }) => {
  //     const salary = parseFloat(row.getValue("salary"));

  //     // Format the salary as Ghana cedi
  //     const formatted = new Intl.NumberFormat("en-US", {
  //       style: "currency",
  //       currency: "GHS",
  //     }).format(salary);
  //     return <div className="text-rght font-medium">{formatted}</div>;
  //   },
  // },
  {
    accessorKey: "role",
    header: "User Role",
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
