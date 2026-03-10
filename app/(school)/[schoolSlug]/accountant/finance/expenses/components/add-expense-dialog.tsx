"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const expenseSchema = z.object({
  description: z.string().min(3, "Description is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  date: z.date({ message: "Date is required" }),
  registryCategoryId: z.string().min(1, "Please select an expenditure category"),
  category: z.string().optional(),
  payee: z.string().optional(),
  paymentMethod: z.string().min(1, "Payment method is required"),
  checkNumber: z.string().optional(),
  voucherNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
});

type FormValues = z.infer<typeof expenseSchema>;

interface AddExpenseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddExpenseDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddExpenseProps) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registryCategories, setRegistryCategories] = useState<any[]>([]);

  // Fetch standard expenditure categories
  useEffect(() => {
    if (open && schoolSlug) {
      console.log(`🔍 [AddExpenseDialog] Fetching categories for ${schoolSlug}`);
      fetch(`/api/schools/${schoolSlug}/finance/expenditure-registry`)
        .then(res => res.json())
        .then(data => {
          console.log(`✅ [AddExpenseDialog] Loaded ${data.length} categories`);
          setRegistryCategories(data);
        })
        .catch(err => console.error("❌ [AddExpenseDialog] Fetch error:", err));
    }
  }, [open, schoolSlug]);

  const form = useForm<FormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: 0,
      date: new Date(),
      registryCategoryId: "",
      category: "OTHER",
      payee: "",
      paymentMethod: "CASH",
      checkNumber: "",
      voucherNumber: "",
      referenceNumber: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const date = watch("date");
  const registryCategoryId = watch("registryCategoryId");
  const paymentMethod = watch("paymentMethod");

  const onFormSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/finance/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to record expense");

      toast.success("Expense recorded successfully");
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to record expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record New Expenditure</DialogTitle>
          <DialogDescription>
            Enter details for the school expense. All fields marked with * are
            required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="description">Description *</FieldLabel>
                <Input
                  id="description"
                  placeholder="e.g. Electricity bill for Jan"
                  {...register("description")}
                />
                <FieldError errors={[errors.description]} />
              </Field>

              <Field data-invalid={!!errors.amount}>
                <FieldLabel htmlFor="amount">Amount (GH₵) *</FieldLabel>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register("amount", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.amount]} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.date} className="flex flex-col">
                <FieldLabel>Transaction Date *</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !date && "text-muted-foreground",
                      )}
                    >
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => setValue("date", d as Date)}
                      disabled={(d) =>
                        d > new Date() || d < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FieldError errors={[errors.date]} />
              </Field>

              <Field data-invalid={!!errors.registryCategoryId}>
                <FieldLabel>Expense Category *</FieldLabel>
                <Select
                  onValueChange={(val) => setValue("registryCategoryId", val)}
                  value={registryCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select standard category" />
                  </SelectTrigger>
                  <SelectContent>
                    {registryCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.registryCategoryId]} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.payee}>
                <FieldLabel htmlFor="payee">Payee / Beneficiary</FieldLabel>
                <Input
                  id="payee"
                  placeholder="e.g. ECG Limited"
                  {...register("payee")}
                />
                <FieldError errors={[errors.payee]} />
              </Field>

              <Field data-invalid={!!errors.voucherNumber}>
                <FieldLabel htmlFor="voucherNumber">
                  Voucher Number (POV)
                </FieldLabel>
                <Input
                  id="voucherNumber"
                  placeholder="POV-2025-001"
                  {...register("voucherNumber")}
                />
                <FieldError errors={[errors.voucherNumber]} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.paymentMethod}>
                <FieldLabel>Payment Method</FieldLabel>
                <Select
                  onValueChange={(val) => setValue("paymentMethod", val)}
                  defaultValue={paymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.paymentMethod]} />
              </Field>

              {paymentMethod === "CHEQUE" ? (
                <Field data-invalid={!!errors.checkNumber}>
                  <FieldLabel htmlFor="checkNumber">Check Number</FieldLabel>
                  <Input
                    id="checkNumber"
                    placeholder="000123"
                    {...register("checkNumber")}
                  />
                  <FieldError errors={[errors.checkNumber]} />
                </Field>
              ) : (
                <Field data-invalid={!!errors.referenceNumber}>
                  <FieldLabel htmlFor="referenceNumber">
                    Ref (Momo/Bank ID)
                  </FieldLabel>
                  <Input
                    id="referenceNumber"
                    placeholder="TXN-123..."
                    {...register("referenceNumber")}
                  />
                  <FieldError errors={[errors.referenceNumber]} />
                </Field>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-32">
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Record
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
