"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { DataTable } from "@/components/ui/data-table/data-table"; // Using shared table
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

type FeeStructure = {
  id: string;
  name: string;
  description: string;
  classLevel: string;
  isActive: boolean;
  _count: { bills: number };
  items: { amount: number }[];
};

export default function FeeStructuresPage() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;
  const [data, setData] = useState<FeeStructure[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(
        `/api/schools/${schoolSlug}/finance/fee-structures`,
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    };
    fetchData();
  }, [schoolSlug]);

  const columns: ColumnDef<FeeStructure>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "classLevel",
      header: "Class Level",
      cell: ({ row }) => row.original.classLevel || "All Levels",
    },
    {
      header: "Total Amount",
      cell: ({ row }) => {
        const total = row.original.items.reduce(
          (sum, item) => sum + Number(item.amount),
          0,
        );
        return `GHS ${total.toFixed(2)}`; // Using default, ideally use formatter
      },
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
      header: "Bills Generated",
      accessorFn: (row) => row._count.bills,
    },
    // Actions column...
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Structures</h1>
          <p className="text-muted-foreground">
            Manage fee templates for classes and departments
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Fee Structure
        </Button>
      </div>

      <DataTable columns={columns} data={data} searchKey="name" />
    </div>
  );
}
