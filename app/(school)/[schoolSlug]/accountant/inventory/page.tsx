"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, Package, History, AlertTriangle } from "lucide-react";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddInventoryItemDialog } from "./components/add-item-dialog";
import { EditInventoryItemDialog } from "./components/edit-item-dialog";
import { InventoryTransactionList } from "./components/transaction-list";
import { Card } from "@/components/ui/card";

type InventoryItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  quantity: number;
  unit: string | null;
  minQuantity: number;
  updatedAt: string;
};

export default function InventoryPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${schoolSlug}/inventory`);
      const data = await res.json();
      setItems(data || []);
    } catch (error) {
      console.error("Failed to fetch inventory", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [schoolSlug]);

  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "name",
      header: "Item Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.category}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Stock Level",
      cell: ({ row }) => {
        const qty = row.original.quantity;
        const min = row.original.minQuantity;
        const isLow = qty <= min;
        return (
          <div className="flex items-center gap-2">
            <span>
              {qty} {row.original.unit}
            </span>
            {isLow && (
              <Badge variant="destructive" className="h-5 py-0">
                Low Stock
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "minQuantity",
      header: "Min. Level",
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setEditingItem(row.original)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Items
              </p>
              <h3 className="text-2xl font-bold">{items.length}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-red-500/10 to-red-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Low Stock
              </p>
              <h3 className="text-2xl font-bold">
                {items.filter((i) => i.quantity <= i.minQuantity).length}
              </h3>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <History className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Inventory Value
              </p>
              <h3 className="text-2xl font-bold">Comprehensive</h3>
            </div>
          </div>
        </Card>
      </div>

      <DashboardPageHeader
        title="School Inventory"
        description="Track school assets, supplies, and stock levels."
      >
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </DashboardPageHeader>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Items
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Stock History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <div className="bg-background rounded-md border shadow-sm p-4">
            <DataTable 
              columns={columns} 
              data={items} 
              searchKey="name" 
              exportTitle="Inventory Items Report"
            />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <InventoryTransactionList />
        </TabsContent>
      </Tabs>

      {isAddOpen && (
        <AddInventoryItemDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onSuccess={fetchItems}
        />
      )}

      {editingItem && (
        <EditInventoryItemDialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onSuccess={fetchItems}
          item={editingItem}
        />
      )}
    </div>
  );
}
