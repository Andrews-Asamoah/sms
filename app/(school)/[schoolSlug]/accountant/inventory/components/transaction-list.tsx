"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type Transaction = {
  id: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  date: string;
  description: string | null;
  item: { name: string };
  performedBy: { name: string } | null;
};

export function InventoryTransactionList() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch(
          `/api/schools/${schoolSlug}/inventory/transactions`,
          {
            method: "POST", // Using POST as I defined it that way for fetching (can be GET too)
          },
        );
        const data = await res.json();
        setTransactions(data || []);
      } catch (error) {
        console.error("Failed to fetch transactions", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [schoolSlug]);

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) =>
        format(new Date(row.original.date), "MMM d, yyyy HH:mm"),
    },
    {
      accessorKey: "item.name",
      header: "Item",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type;
        return (
          <Badge
            variant={
              type === "IN"
                ? "default"
                : type === "OUT"
                  ? "destructive"
                  : "secondary"
            }
          >
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "quantity",
      header: "Qty",
      cell: ({ row }) => (
        <span
          className={
            row.original.type === "IN" ? "text-green-600" : "text-red-600"
          }
        >
          {row.original.type === "OUT" ? "-" : "+"}
          {row.original.quantity}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Notes",
    },
    {
      accessorKey: "performedBy.name",
      header: "By",
    },
  ];

  return (
    <div className="bg-background rounded-md border shadow-sm p-4">
      <DataTable 
        columns={columns} 
        data={transactions} 
        searchKey="item_name" 
        exportTitle="Inventory Transactions Report"
      />
    </div>
  );
}
