"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
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
import { Loader2 } from "lucide-react";

const expenseSchema = z.object({
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  customCategoryId: z.string().optional(),
  registryCategoryId: z.string().min(1, "Category is required"),
  payee: z.string().optional(),
  paymentMethod: z.enum([
    "CASH",
    "BANK_TRANSFER",
    "MOBILE_MONEY",
    "CHECK",
    "OTHER",
  ]),
  referenceNumber: z.string().optional(),
  voucherNumber: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface Category {
  id: string;
  name: string;
}

interface ExpenseFormProps {
  schoolSlug: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: {
    id: string;
    amount: number;
    date: Date | string;
    description: string;
    customCategoryId?: string;
    registryCategoryId: string;
    payee?: string;
    paymentMethod: string;
    referenceNumber?: string;
    voucherNumber?: string;
    notes?: string;
  };
}

export function ExpenseForm({
  schoolSlug,
  onSuccess,
  onCancel,
  initialData,
}: ExpenseFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: initialData?.amount?.toString() || "",
      date: initialData?.date
        ? new Date(initialData.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      description: initialData?.description || "",
      customCategoryId: initialData?.customCategoryId || "",
      registryCategoryId: initialData?.registryCategoryId || "",
      payee: initialData?.payee || "",
      paymentMethod: (initialData?.paymentMethod as any) || "CASH",
      referenceNumber: initialData?.referenceNumber || "",
      voucherNumber: initialData?.voucherNumber || "",
      notes: initialData?.notes || "",
    },
  });

  const registryCategoryId = watch("registryCategoryId");
  const paymentMethod = watch("paymentMethod");

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCats(true);
      try {
        const res = await fetch(
          `/api/schools/${schoolSlug}/finance/expenditure-registry`,
        );
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCategories();
  }, [schoolSlug]);

  const onSubmit: SubmitHandler<ExpenseFormValues> = async (values) => {
    setSubmitting(true);
    try {
      const url = initialData
        ? `/api/schools/${schoolSlug}/finance/expenses/${initialData.id}`
        : `/api/schools/${schoolSlug}/finance/expenses`;

      const res = await fetch(url, {
        method: initialData ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save expense");
      }

      toast.success(initialData ? "Expense updated" : "Expense recorded");
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="exp-amount">Amount (GHS)</FieldLabel>
            <Input
              id="exp-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("amount")}
            />
            <FieldError errors={[errors.amount]} />
          </Field>
          <Field data-invalid={!!errors.date}>
            <FieldLabel htmlFor="exp-date">Date</FieldLabel>
            <Input id="exp-date" type="date" {...register("date")} />
            <FieldError errors={[errors.date]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="exp-desc">Description</FieldLabel>
          <Input id="exp-desc" placeholder="What was this expense for?" {...register("description")} />
          <FieldError errors={[errors.description]} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.registryCategoryId}>
            <FieldLabel htmlFor="cat-select">Category</FieldLabel>
            <Select
              onValueChange={(val) => setValue("registryCategoryId", val)}
              value={registryCategoryId}
            >
              <SelectTrigger id="cat-select">
                <SelectValue
                  placeholder={
                    loadingCats ? "Loading..." : "Select category"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground italic text-center">
                    No categories found.
                  </div>
                ) : (
                  categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.registryCategoryId]} />
          </Field>
          <Field data-invalid={!!errors.paymentMethod}>
            <FieldLabel htmlFor="meth-select">Payment Method</FieldLabel>
            <Select
              onValueChange={(val) => setValue("paymentMethod", val as any)}
              value={paymentMethod}
            >
              <SelectTrigger id="meth-select">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                <SelectItem value="CHECK">Check</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <FieldError errors={[errors.paymentMethod]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.payee}>
          <FieldLabel htmlFor="exp-payee">Payee (Optional)</FieldLabel>
          <Input id="exp-payee" placeholder="Who was paid?" {...register("payee")} />
          <FieldError errors={[errors.payee]} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.referenceNumber}>
            <FieldLabel htmlFor="exp-ref">Ref # (Optional)</FieldLabel>
            <Input id="exp-ref" placeholder="Check #, Transaction ID" {...register("referenceNumber")} />
            <FieldError errors={[errors.referenceNumber]} />
          </Field>
          <Field data-invalid={!!errors.voucherNumber}>
            <FieldLabel htmlFor="exp-vouch">Voucher # (Optional)</FieldLabel>
            <Input id="exp-vouch" placeholder="POV-001" {...register("voucherNumber")} />
            <FieldError errors={[errors.voucherNumber]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="exp-notes">Additional Notes (Optional)</FieldLabel>
          <Textarea
            id="exp-notes"
            placeholder="Any other details..."
            className="resize-none"
            {...register("notes")}
          />
          <FieldError errors={[errors.notes]} />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Expense" : "Record Expense"}
        </Button>
      </div>
    </form>
  );
}
