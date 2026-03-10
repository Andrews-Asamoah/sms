"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { StudentSearch } from "@/components/school/students/student-search";

const transactionSchema = z.object({
  itemId: z.string().min(1, "Please select an item"),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  description: z.string(),
  recipientId: z.string(),
  recipientName: z.string(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface StockTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolSlug: string;
  items: { id: string; name: string; quantity: number }[];
  initialType?: "IN" | "OUT" | "ADJUSTMENT";
  initialItemId?: string;
  onSuccess?: () => void;
}

export function StockTransactionSheet({
  open,
  onOpenChange,
  schoolSlug,
  items,
  initialType = "IN",
  initialItemId,
  onSuccess,
}: StockTransactionSheetProps) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      itemId: initialItemId || "",
      type: initialType,
      quantity: 1,
      description: "",
      recipientId: "",
      recipientName: "",
    },
  });

  const transactionType = watch("type");
  const selectedItemId = watch("itemId");
  const selectedItem = items.find((i) => i.id === selectedItemId);
  const recipientName = watch("recipientName");

  const onSubmit: SubmitHandler<TransactionFormValues> = async (values) => {
    if (
      values.type === "OUT" &&
      selectedItem &&
      values.quantity > selectedItem.quantity
    ) {
      toast.error(`Quantity exceeds current stock of ${selectedItem.quantity}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/inventory/transactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to record transaction");
      }

      toast.success("Transaction recorded successfully");
      reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error recording transaction",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {transactionType === "IN"
              ? "Add Stock"
              : transactionType === "OUT"
                ? "Issue Stock"
                : "Adjust Stock"}
          </SheetTitle>
          <SheetDescription>
            Record movement of items in the school inventory.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <FieldGroup>
            <Field data-invalid={!!errors.itemId}>
              <FieldLabel htmlFor="inv-item">Item</FieldLabel>
              <Select
                onValueChange={(val) => setValue("itemId", val)}
                value={selectedItemId}
                disabled={!!initialItemId}
              >
                <SelectTrigger id="inv-item">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.quantity} in stock)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[errors.itemId]} />
            </Field>

            <Field data-invalid={!!errors.type}>
              <FieldLabel htmlFor="inv-type">Transaction Type</FieldLabel>
              <Select
                onValueChange={(val) => setValue("type", val as any)}
                value={transactionType}
              >
                <SelectTrigger id="inv-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Stock In (Addition)</SelectItem>
                  <SelectItem value="OUT">Stock Out (Issuance)</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[errors.type]} />
            </Field>

            <Field data-invalid={!!errors.quantity}>
              <FieldLabel htmlFor="inv-qty">Quantity</FieldLabel>
              <Input
                id="inv-qty"
                type="number"
                {...register("quantity", { valueAsNumber: true })}
              />
              <FieldError errors={[errors.quantity]} />
            </Field>

            {transactionType === "OUT" && (
              <div className="space-y-4 border rounded-lg p-3 bg-muted/50">
                <FieldLabel>Recipient Details (Optional)</FieldLabel>
                <div className="space-y-3">
                  <FieldDescription>
                    Who is receiving these items? Search for a student or type a
                    name.
                  </FieldDescription>
                  <StudentSearch
                    onSelect={(student) => {
                      setValue("recipientId", student.id);
                      setValue("recipientName", student.name);
                    }}
                  />
                  <Field data-invalid={!!errors.recipientName}>
                    <Input
                      placeholder="Or type staff/manual name..."
                      {...register("recipientName")}
                    />
                    <FieldError errors={[errors.recipientName]} />
                  </Field>
                </div>
              </div>
            )}

            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="inv-desc">Description / Source</FieldLabel>
              <Textarea
                id="inv-desc"
                placeholder={
                  transactionType === "IN"
                    ? "Supplier name, invoice #, etc."
                    : "Purpose of issuance..."
                }
                className="resize-none"
                {...register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>
          </FieldGroup>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Record
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
