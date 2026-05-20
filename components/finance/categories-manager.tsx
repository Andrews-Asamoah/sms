"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Tag, Receipt, Archive, Trash2, Edit2, Loader2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
}

interface CategoriesManagerProps {
  initialFeeItems: any[];
  initialExpenseCategories: any[];
  initialInventoryCategories: InventoryCategory[];
}

export function CategoriesManager({
  initialFeeItems,
  initialExpenseCategories,
  initialInventoryCategories,
}: CategoriesManagerProps) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  const [feeItems, setFeeItems] = useState<any[]>(initialFeeItems);
  const [expenseCategories, setExpenseCategories] = useState<any[]>(initialExpenseCategories);
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>(
    initialInventoryCategories,
  );

  // ── Shared add/edit dialog ──────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"fee" | "expense" | "inventory">("fee");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Delete confirmation (inventory categories) ──────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<InventoryCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const [feeRes, expRes, invRes] = await Promise.all([
        fetch(`/api/schools/${schoolSlug}/finance/fee-item-registry`),
        fetch(`/api/schools/${schoolSlug}/finance/expenditure-registry`),
        fetch(`/api/schools/${schoolSlug}/inventory/categories`),
      ]);
      if (feeRes.ok) setFeeItems(await feeRes.json());
      if (expRes.ok) setExpenseCategories(await expRes.json());
      if (invRes.ok) setInventoryCategories(await invRes.json());
    } catch {
      toast.error("Failed to reload categories.");
    }
  };

  // ── Dialog openers ───────────────────────────────────────────────────────
  const openDialog = (type: "fee" | "expense" | "inventory") => {
    setDialogType(type);
    setEditingId(null);
    setFormData({ name: "", description: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (type: "fee" | "expense" | "inventory", item: any) => {
    setDialogType(type);
    setEditingId(item.id);
    setFormData({ name: item.name, description: item.description || "" });
    setDialogOpen(true);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error("Name is required");

    setSaving(true);

    let endpoint =
      dialogType === "fee"
        ? `/api/schools/${schoolSlug}/finance/fee-item-registry`
        : dialogType === "expense"
          ? `/api/schools/${schoolSlug}/finance/expenditure-registry`
          : `/api/schools/${schoolSlug}/inventory/categories`;

    if (editingId) endpoint += `/${editingId}`;

    try {
      const res = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save");
      }

      const label =
        dialogType === "fee"
          ? "Fee item"
          : dialogType === "expense"
            ? "Expense category"
            : "Inventory category";

      toast.success(`${label} ${editingId ? "updated" : "created"}.`);
      setDialogOpen(false);
      setEditingId(null);
      await fetchData();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete inventory category ────────────────────────────────────────────
  const handleDeleteInventoryCategory = async (cat: InventoryCategory) => {
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/inventory/categories/${cat.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete");
      }
      toast.success(`"${cat.name}" deleted`);
      setDeleteTarget(null);
      await fetchData();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category.");
    } finally {
      setIsDeleting(false);
    }
  };

  const dialogLabel =
    dialogType === "fee"
      ? "Fee Item"
      : dialogType === "expense"
        ? "Expense Category"
        : "Inventory Category";

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Financial Categories"
        description="Manage standard items for fee billing, expenditure tracking, and inventory."
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
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Inventory Categories
          </TabsTrigger>
        </TabsList>

        {/* ── Fee Items Tab ── */}
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

        {/* ── Expense Categories Tab ── */}
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

        {/* ── Inventory Categories Tab ── */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Inventory Categories</CardTitle>
                <CardDescription>
                  Categories for organising school inventory items (e.g., Uniforms, Stationery, Equipment, Sports Gear).
                </CardDescription>
              </div>
              <Button onClick={() => openDialog("inventory")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
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
                    {inventoryCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          No inventory categories defined yet. Add one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventoryCategories.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {cat.description ?? "—"}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => openEditDialog("inventory", cat)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(cat)}
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* ── Shared add / edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit" : "Add"} {dialogLabel}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "inventory"
                ? "Create a standardised category to keep your inventory consistent."
                : "Create a standardized name to ensure consistent categorization across reports."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cat-name"
                placeholder={
                  dialogType === "fee"
                    ? "e.g. PTA Dues, Basic Tuition"
                    : dialogType === "expense"
                      ? "e.g. Travel, Software Subscriptions"
                      : "e.g. Uniforms, Stationery, Equipment"
                }
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-description">Description (Optional)</Label>
              <Textarea
                id="cat-description"
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
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation (inventory categories only) ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the category. Existing inventory items that use this
              category will retain the name as text but it will no longer appear in
              the dropdown. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => deleteTarget && handleDeleteInventoryCategory(deleteTarget)}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
