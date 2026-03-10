// app/(school)/[schoolSlug]/accountant/people/staff/staff-table.tsx
"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { SalaryDialog } from "./salary-dialog";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  salary: number;
  type: "TEACHER" | "STAFF";
  isActive: boolean;
}

interface StaffDataTableProps {
  data: StaffMember[];
  schoolSlug: string;
}

export function StaffDataTable({ data, schoolSlug }: StaffDataTableProps) {
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns: ColumnDef<StaffMember>[] = [
    {
      accessorKey: "fullName",
      header: "Name",
      cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
    },
    {
      accessorKey: "role",
      header: "Role",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.type === "TEACHER" ? "Teaching" : "Non-Teaching"}
        </Badge>
      ),
    },
    {
      accessorKey: "salary",
      header: "Monthly Salary",
      cell: ({ row }) => (
        <span className="font-semibold">
          {formatCurrency(row.original.salary)}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedMember(row.original);
            setDialogOpen(true);
          }}
        >
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Salary
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="fullName"
      />
      {selectedMember && (
        <SalaryDialog
          member={selectedMember}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          schoolSlug={schoolSlug}
        />
      )}
    </>
  );
}
