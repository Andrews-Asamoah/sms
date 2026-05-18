"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
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
  SelectItem,
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
    } catch (error) {
      toast.error("Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
          <DialogDescription>
            Update details for this inventory item. Note: Quantity cannot be changed here, please add a transaction instead.
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
              <Field data-invalid={!!errors.category}>
                <FieldLabel htmlFor="edit-category">Category</FieldLabel>
                <Input
                  id="edit-category"
                  placeholder="Stationery"
                  {...register("category")}
                />
                <FieldError errors={[errors.category]} />
              </Field>
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
                    <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="liters">Liters (L)</SelectItem>
                    <SelectItem value="packs">Packs</SelectItem>
                    <SelectItem value="reams">Reams</SelectItem>
                    <SelectItem value="bottles">Bottles</SelectItem>
                    <SelectItem value="rolls">Rolls</SelectItem>
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
  );
}
