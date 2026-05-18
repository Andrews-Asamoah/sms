"use client";

import { useState } from "react";
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
  quantity: z.number().min(0),
  unit: z.string().min(1, "Unit is required"),
  minQuantity: z.number().min(0),
});

type FormValues = z.infer<typeof itemSchema>;

interface AddItemProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddInventoryItemDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddItemProps) {
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
      name: "",
      description: "",
      category: "",
      quantity: 0,
      unit: "pcs",
      minQuantity: 0,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to add item");

      toast.success("Item added to inventory");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>
            Register a new item in the school inventory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">Item Name</FieldLabel>
              <Input
                id="name"
                placeholder="e.g. Whiteboard Markers"
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.category}>
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <Input
                  id="category"
                  placeholder="Stationery"
                  {...register("category")}
                />
                <FieldError errors={[errors.category]} />
              </Field>
              <Field data-invalid={!!errors.unit}>
                <FieldLabel htmlFor="unit">Unit</FieldLabel>
                <Select
                  onValueChange={(val) => setValue("unit", val)}
                  value={watch("unit")}
                >
                  <SelectTrigger id="unit">
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

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.quantity}>
                <FieldLabel htmlFor="quantity">Initial Quantity</FieldLabel>
                <Input
                  id="quantity"
                  type="number"
                  {...register("quantity", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.quantity]} />
              </Field>
              <Field data-invalid={!!errors.minQuantity}>
                <FieldLabel htmlFor="minQuantity">Alert at level</FieldLabel>
                <Input
                  id="minQuantity"
                  type="number"
                  {...register("minQuantity", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.minQuantity]} />
              </Field>
            </div>

            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea id="description" {...register("description")} />
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
                Add Item
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
