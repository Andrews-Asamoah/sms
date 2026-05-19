"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Tag, Receipt, Trash2, Edit2, Loader2 } from "lucide-react";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface CategoriesManagerProps {
  initialFeeItems: any[];
  initialExpenseCategories: any[];
}

export function CategoriesManager({
  initialFeeItems,
  initialExpenseCategories,
}: CategoriesManagerProps) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  
  const [feeItems, setFeeItems] = useState<any[]>(initialFeeItems);
  const [expenseCategories, setExpenseCategories] = useState<any[]>(initialExpenseCategories);
  
  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"fee" | "expense">("fee");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [feeRes, expRes] = await Promise.all([
        fetch(`/api/schools/${schoolSlug}/finance/fee-item-registry`),
        fetch(`/api/schools/${schoolSlug}/finance/expenditure-registry`),
      ]);
      if (feeRes.ok) setFeeItems(await feeRes.json());
      if (expRes.ok) setExpenseCategories(await expRes.json());
    } catch (error) {
      console.error("Failed to fetch categories", error);
      toast.error("Failed to load categories.");
    }
  };

  const router = useRouter();

  const openDialog = (type: "fee" | "expense") => {
    setDialogType(type);
    setEditingId(null);
    setFormData({ name: "", description: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (type: "fee" | "expense", item: any) => {
    setDialogType(type);
    setEditingId(item.id);
    setFormData({ name: item.name, description: item.description || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error("Name is required");

    setSaving(true);
    let endpoint =
      dialogType === "fee"
        ? `/api/schools/${schoolSlug}/finance/fee-item-registry`
        : `/api/schools/${schoolSlug}/finance/expenditure-registry`;

    if (editingId) {
      endpoint += `/${editingId}`;
    }

    try {
      const res = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success(
        `${dialogType === "fee" ? "Fee item" : "Expense category"} ${editingId ? "updated" : "created"}.`,
      );
      setDialogOpen(false);
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Financial Categories"
        description="Manage standard items for fee billing and expenditure tracking."
      />

      <Tabs defaultValue="fees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Fee Items Registry
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Expenditure Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fee Items Registry</CardTitle>
                <CardDescription>
                  Standard fee names used across all fee structures (e.g., Tuition, PTA, ICT Levy).
                </CardDescription>
              </div>
              <Button onClick={() => openDialog("fee")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Fee Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          No fee items defined yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      feeItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground">{item.description}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => openEditDialog("fee", item)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Expenditure Categories</CardTitle>
                <CardDescription>
                  Standard categories for grouping expenses (e.g., Office Supplies, Utilities, Maintenance).
                </CardDescription>
              </div>
              <Button onClick={() => openDialog("expense")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense Category
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          No expenditure categories defined yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenseCategories.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground">{item.description}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => openEditDialog("expense", item)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit" : "Add"} {dialogType === "fee" ? "Fee Item" : "Expense Category"}
            </DialogTitle>
            <DialogDescription>
              Create a standardized name to ensure consistent categorization across reports.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                placeholder={dialogType === "fee" ? "e.g. PTA Dues, Basic Tuition" : "e.g. Travel, Software Subscriptions"}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of when to use this item..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
