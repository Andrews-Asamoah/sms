"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
  FieldDescription,
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
import { useRouter } from "next/navigation";
import { Loader2, DollarSign } from "lucide-react";
import { StudentSearch } from "@/components/school/students/student-search";
import { Checkbox } from "@/components/ui/checkbox";

const paymentSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  billId: z.string().min(1, "Please select a bill"),
  amount: z.string().min(1, "Amount is required"),
  paymentMethod: z.enum([
    "CASH",
    "BANK_TRANSFER",
    "MOBILE_MONEY",
    "CHECK",
    "OTHER",
  ]),
  paymentDate: z.string().min(1, "Payment date is required"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      billItemId: z.string(),
      amount: z.string(),
      selected: z.boolean(),
    }),
  ),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface Bill {
  id: string;
  billNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  feeStructure?: { name: string };
  items: {
    id: string;
    description: string;
    amount: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
  }[];
}

interface RecordPaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: string;
  studentName?: string;
  schoolSlug: string;
  initialBillId?: string;
  onSuccess?: () => void;
}

export function RecordPaymentSheet({
  open,
  onOpenChange,
  studentId,
  studentName,
  schoolSlug,
  initialBillId,
  onSuccess,
}: RecordPaymentSheetProps) {
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
  } | null>(studentId ? { id: studentId, name: studentName || "" } : null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      studentId: studentId || "",
      billId: initialBillId || "",
      amount: "0",
      paymentMethod: "CASH",
      paymentDate: new Date().toISOString().split("T")[0],
      referenceNumber: "",
      notes: "",
      items: [],
    },
  });

  const selectedBillId = watch("billId");
  const selectedBill = bills.find((b) => b.id === selectedBillId);
  const formItems = watch("items");
  const paymentMethod = watch("paymentMethod");

  useEffect(() => {
    if (selectedStudent?.id) {
      setValue("studentId", selectedStudent.id);
    }
  }, [selectedStudent, setValue]);

  useEffect(() => {
    if (open && selectedStudent?.id) {
      const fetchBills = async () => {
        setLoadingBills(true);
        try {
          const res = await fetch(
            `/api/schools/${schoolSlug}/finance/students/${selectedStudent.id}/unpaid-bills`,
          );
          if (res.ok) {
            const data = await res.json();
            setBills(data);

            if (initialBillId) {
              const bill = data.find((b: Bill) => b.id === initialBillId);
              if (bill) {
                setValue("amount", bill.balanceAmount.toString());
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch bills:", error);
          toast.error("Failed to load unpaid bills");
        } finally {
          setLoadingBills(false);
        }
      };
      fetchBills();
    }
  }, [open, selectedStudent?.id, schoolSlug, initialBillId, setValue]);

  // Update items when bill is selected
  useEffect(() => {
    if (selectedBill) {
      const initialItems = selectedBill.items.map((item) => ({
        billItemId: item.id,
        amount: item.balanceAmount.toString(),
        selected: true,
      }));
      setValue("items", initialItems);

      const total = initialItems.reduce(
        (sum, item) => sum + (parseFloat(item.amount) || 0),
        0,
      );
      setValue("amount", total.toString());
    }
  }, [selectedBillId, setValue, selectedBill]);

  // Sync total amount when item amounts change
  useEffect(() => {
    const total = (formItems || [])
      .filter((i) => i.selected)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    setValue("amount", total.toString());
  }, [formItems, setValue]);

  const onSubmit = async (values: PaymentFormValues) => {
    if (
      selectedBill &&
      parseFloat(values.amount) > Number(selectedBill.balanceAmount)
    ) {
      toast.error(`Amount exceeds bill balance of GHS ${selectedBill.balanceAmount}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/finance/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to process payment");
      }

      toast.success("Payment recorded successfully");
      reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error recording payment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Record Payment</SheetTitle>
          <SheetDescription>
            {selectedStudent ? (
              <>
                Record a fee payment for <strong>{selectedStudent.name}</strong>
                .
              </>
            ) : (
              "Search for a student to record a payment."
            )}
          </SheetDescription>
        </SheetHeader>

        {!selectedStudent && (
          <div className="py-6">
            <StudentSearch onSelect={setSelectedStudent} />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <FieldGroup>
            <Field data-invalid={!!errors.billId}>
              <FieldLabel htmlFor="bill-select">Select Bill</FieldLabel>
              <Select
                onValueChange={(val) => setValue("billId", val)}
                value={selectedBillId}
                disabled={loadingBills || !!initialBillId}
              >
                <SelectTrigger id="bill-select">
                  <SelectValue
                    placeholder={
                      loadingBills
                        ? "Loading bills..."
                        : "Select a bill to pay"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {bills.map((bill) => (
                    <SelectItem key={bill.id} value={bill.id}>
                      {bill.billNumber} - {bill.feeStructure?.name} (Bal:
                      GHS {Number(bill.balanceAmount).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[errors.billId]} />
            </Field>

            {selectedBill && (
              <div className="space-y-3">
                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex justify-between text-base font-bold text-emerald-700 dark:text-emerald-400">
                    <span>Outstanding Balance:</span>
                    <span>
                      GHS {Number(selectedBill.balanceAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel>Payable Items</FieldLabel>
                  <div className="space-y-2 border rounded-md p-3">
                    {selectedBill.items.map((item, index) => {
                      const itemForm = formItems?.[index];
                      if (!itemForm) return null;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 py-1 border-b last:border-0"
                        >
                          <Checkbox
                            id={`item-${item.id}`}
                            checked={itemForm.selected}
                            onCheckedChange={(checked: boolean) => {
                              const newItems = [...(formItems || [])];
                              newItems[index] = {
                                ...newItems[index],
                                selected: !!checked,
                              };
                              setValue("items", newItems);
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={`item-${item.id}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {item.description}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              Bal: GHS {Number(item.balanceAmount).toFixed(2)}
                            </p>
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              className="h-8 text-right"
                              disabled={!itemForm.selected}
                              value={itemForm.amount}
                              onChange={(e) => {
                                const newItems = [...(formItems || [])];
                                newItems[index] = {
                                  ...itemForm,
                                  amount: e.target.value,
                                };
                                setValue("items", newItems);
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <Field data-invalid={!!errors.amount}>
              <FieldLabel htmlFor="payment-amount">Payment Amount (GHS)</FieldLabel>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-9"
                  {...register("amount")}
                />
              </div>
              <FieldError errors={[errors.amount]} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.paymentMethod}>
                <FieldLabel htmlFor="method-select">Method</FieldLabel>
                <Select
                  onValueChange={(val) => setValue("paymentMethod", val as any)}
                  value={paymentMethod}
                >
                  <SelectTrigger id="method-select">
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

              <Field data-invalid={!!errors.paymentDate}>
                <FieldLabel htmlFor="payment-date">Date</FieldLabel>
                <Input id="payment-date" type="date" {...register("paymentDate")} />
                <FieldError errors={[errors.paymentDate]} />
              </Field>
            </div>

            <Field data-invalid={!!errors.referenceNumber}>
              <FieldLabel htmlFor="ref-num">Reference # (Optional)</FieldLabel>
              <Input
                id="ref-num"
                placeholder="Transaction ID, Check #, etc."
                {...register("referenceNumber")}
              />
              <FieldError errors={[errors.referenceNumber]} />
            </Field>

            <Field data-invalid={!!errors.notes}>
              <FieldLabel htmlFor="notes">Notes (Optional)</FieldLabel>
              <Textarea
                id="notes"
                placeholder="Add any internal remarks..."
                className="resize-none"
                {...register("notes")}
              />
              <FieldError errors={[errors.notes]} />
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
              Record Payment
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
