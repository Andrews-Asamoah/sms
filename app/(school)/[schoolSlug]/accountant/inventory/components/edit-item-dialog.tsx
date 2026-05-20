"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetchers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// ─── Comprehensive unit list for school inventory ───────────────────────────
const UNIT_GROUPS = [
  {
    label: "General",
    units: [
      { value: "pcs", label: "Pieces (pcs)" },
      { value: "sets", label: "Sets" },
      { value: "pairs", label: "Pairs" },
      { value: "dozens", label: "Dozens" },
    ],
  },
  {
    label: "Packaging",
    units: [
      { value: "boxes", label: "Boxes" },
      { value: "packs", label: "Packs" },
      { value: "cartons", label: "Cartons" },
      { value: "bundles", label: "Bundles" },
      { value: "bags", label: "Bags" },
      { value: "crates", label: "Crates" },
    ],
  },
  {
    label: "Fabric & Uniforms",
    units: [
      { value: "yards", label: "Yards" },
      { value: "metres", label: "Metres (m)" },
    ],
  },
  {
    label: "Liquid",
    units: [
      { value: "liters", label: "Litres (L)" },
      { value: "gallons", label: "Gallons" },
    ],
  },
  {
    label: "Weight",
    units: [
      { value: "kg", label: "Kilograms (kg)" },
      { value: "grams", label: "Grams (g)" },
      { value: "tonnes", label: "Tonnes" },
    ],
  },
  {
    label: "Paper & Stationery",
    units: [
      { value: "reams", label: "Reams" },
      { value: "sheets", label: "Sheets" },
    ],
  },
  {
    label: "Other",
    units: [
      { value: "rolls", label: "Rolls" },
      { value: "bottles", label: "Bottles" },
      { value: "tokens", label: "Tokens" },
    ],
  },
];

interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
}

const itemSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  minQuantity: z.number().min(0),
});

type FormValues = z.infer<typeof itemSchema>;

interface EditItemProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  item: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    unit: string | null;
    minQuantity: number;
  };
}

export function EditInventoryItemDialog({
  open,
  onOpenChange,
  onSuccess,
  item,
}: EditItemProps) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick-add category state
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const { data: categories = [], mutate: mutateCategories } =
    useSWR<InventoryCategory[]>(
      open ? `/api/schools/${schoolSlug}/inventory/categories` : null,
      fetcher,
      { revalidateOnFocus: false, dedupingInterval: 60_000 },
    );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      unit: item.unit || "pcs",
      minQuantity: item.minQuantity || 0,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: item.name || "",
        description: item.description || "",
        category: item.category || "",
        unit: item.unit || "pcs",
        minQuantity: item.minQuantity || 0,
      });
    }
  }, [open, item, reset]);

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsSavingCategory(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/inventory/categories`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCategoryName.trim() }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add category");
      }
      const created: InventoryCategory = await res.json();
      await mutateCategories();
      setValue("category", created.name);
      setNewCategoryName("");
      setIsAddCategoryOpen(false);
      toast.success(`Category "${created.name}" added`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add category");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update item");

      toast.success("Item updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>
              Update details for this inventory item. Note: Quantity cannot be
              changed here, please add a transaction instead.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="edit-name">Item Name</FieldLabel>
                <Input
                  id="edit-name"
                  placeholder="e.g. Whiteboard Markers"
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                {/* Category — DB-driven dropdown */}
                <Field data-invalid={!!errors.category}>
                  <FieldLabel
                    htmlFor="edit-category"
                    className="flex items-center justify-between"
                  >
                    Category
                    <button
                      type="button"
                      className="ml-1 text-primary hover:text-primary/80 transition-colors"
                      onClick={() => setIsAddCategoryOpen(true)}
                      title="Add new category"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </FieldLabel>
                  <Select
                    onValueChange={(val) => setValue("category", val)}
                    value={watch("category") ?? ""}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          No categories yet.{" "}
                          <button
                            type="button"
                            className="text-primary underline"
                            onClick={() => setIsAddCategoryOpen(true)}
                          >
                            Add one
                          </button>
                        </div>
                      ) : (
                        categories.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[errors.category]} />
                </Field>

                {/* Unit — grouped dropdown */}
                <Field data-invalid={!!errors.unit}>
                  <FieldLabel htmlFor="edit-unit">Unit</FieldLabel>
                  <Select
                    onValueChange={(val) => setValue("unit", val)}
                    value={watch("unit")}
                  >
                    <SelectTrigger id="edit-unit">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_GROUPS.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel className="text-xs text-muted-foreground px-2 py-1">
                            {group.label}
                          </SelectLabel>
                          {group.units.map((u) => (
                            <SelectItem key={u.value} value={u.value}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[errors.unit]} />
                </Field>
              </div>

              <Field data-invalid={!!errors.minQuantity}>
                <FieldLabel htmlFor="edit-minQuantity">Alert at level</FieldLabel>
                <Input
                  id="edit-minQuantity"
                  type="number"
                  {...register("minQuantity", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.minQuantity]} />
              </Field>

              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="edit-description">Description</FieldLabel>
                <Textarea id="edit-description" {...register("description")} />
                <FieldError errors={[errors.description]} />
              </Field>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick-add category dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Inventory Category</DialogTitle>
            <DialogDescription>
              Add a category to keep your inventory organised.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-new-cat-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-new-cat-name"
                placeholder="e.g. Uniforms, Stationery, Equipment"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickAddCategory();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddCategoryOpen(false);
                setNewCategoryName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickAddCategory}
              disabled={isSavingCategory || !newCategoryName.trim()}
            >
              {isSavingCategory && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
