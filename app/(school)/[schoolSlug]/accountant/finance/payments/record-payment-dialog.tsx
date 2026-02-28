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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const paymentSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  billId: z.string().min(1, "Please select a bill"),
  amount: z.number().min(0.01, "Amount must be positive"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CHEQUE"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof paymentSchema>;

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preSelectedStudentId?: string;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  onSuccess,
  preSelectedStudentId,
}: RecordPaymentDialogProps) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      studentId: preSelectedStudentId || "",
      billId: "",
      amount: 0,
      paymentMethod: "CASH",
      referenceNumber: "",
      notes: "",
    },
  });

  const studentId = watch("studentId");
  const billId = watch("billId");
  const paymentMethod = watch("paymentMethod");

  useEffect(() => {
    if (!open) return;
    const loadData = async () => {
      try {
        const res = await fetch(
          `/api/schools/${schoolSlug}/finance/students/outstanding`,
        );
        if (res.ok) setStudents(await res.json());
      } catch (e) {
        console.error("Failed to load students", e);
      }
    };
    loadData();
  }, [open, schoolSlug]);

  useEffect(() => {
    if (!studentId) {
      setBills([]);
      return;
    }
    const loadBills = async () => {
      try {
        const res = await fetch(
          `/api/schools/${schoolSlug}/finance/invoices?studentId=${studentId}&status=PENDING`,
        );
        if (res.ok) {
          const fetchedBills = await res.json();
          setBills(fetchedBills);
        }
      } catch (e) {
        console.error("Failed to load bills", e);
      }
    };
    loadBills();
  }, [studentId, schoolSlug]);

  useEffect(() => {
    if (billId) {
      const b = bills.find((x) => x.id === billId);
      if (b) {
        setValue("amount", Number(b.balanceAmount));
      }
    }
  }, [billId, bills, setValue]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/finance/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to record payment");
      }

      toast.success("Payment recorded successfully");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Process a transaction for an outstanding student bill.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field data-invalid={!!errors.studentId}>
              <FieldLabel>Select Student</FieldLabel>
              <Select
                onValueChange={(val) => setValue("studentId", val)}
                defaultValue={studentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Search student with balance..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.profile.firstName} {s.profile.lastName} - GHS{" "}
                      {Number(s.outstandingBalance).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[errors.studentId]} />
            </Field>

            <Field data-invalid={!!errors.billId}>
              <FieldLabel>Select Bill to Pay</FieldLabel>
              <Select
                onValueChange={(val) => setValue("billId", val)}
                defaultValue={billId}
                disabled={!studentId || bills.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outstanding invoice" />
                </SelectTrigger>
                <SelectContent>
                  {bills.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.feeStructure?.name || b.billNumber} (Bal: GHS{" "}
                      {Number(b.balanceAmount).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[errors.billId]} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.amount}>
                <FieldLabel htmlFor="amount">Amount (GHS)</FieldLabel>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register("amount", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.amount]} />
              </Field>

              <Field data-invalid={!!errors.paymentMethod}>
                <FieldLabel>Method</FieldLabel>
                <Select
                  onValueChange={(val) => setValue("paymentMethod", val as any)}
                  defaultValue={paymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="MOBILE_MONEY"> Mobile Money</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.paymentMethod]} />
              </Field>
            </div>

            <Field data-invalid={!!errors.referenceNumber}>
              <FieldLabel htmlFor="referenceNumber">
                Ref Number (Momo/Bank Txn ID)
              </FieldLabel>
              <Input
                id="referenceNumber"
                placeholder="Optional"
                {...register("referenceNumber")}
              />
              <FieldError errors={[errors.referenceNumber]} />
            </Field>

            <Field data-invalid={!!errors.notes}>
              <FieldLabel htmlFor="notes">Notes (Optional)</FieldLabel>
              <Textarea
                id="notes"
                placeholder="Any receipt remarks..."
                rows={2}
                {...register("notes")}
              />
              <FieldError errors={[errors.notes]} />
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
                Record Payment
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
