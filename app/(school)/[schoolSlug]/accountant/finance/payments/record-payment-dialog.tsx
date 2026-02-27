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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

  const form = useForm<FormValues>({
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

  const selectedStudentId = form.watch("studentId");
  const selectedBillId = form.watch("billId");

  useEffect(() => {
    if (!open) return;
    const loadData = async () => {
      try {
        // Load outstanding students
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
    if (!selectedStudentId) {
      setBills([]);
      return;
    }
    const loadBills = async () => {
      try {
        const res = await fetch(
          `/api/schools/${schoolSlug}/finance/invoices?studentId=${selectedStudentId}&status=PENDING`,
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
  }, [selectedStudentId, schoolSlug]);

  useEffect(() => {
    // Auto-fill amount if bill selected
    if (selectedBillId) {
      const b = bills.find((x) => x.id === selectedBillId);
      if (b) {
        form.setValue("amount", Number(b.balanceAmount));
      }
    }
  }, [selectedBillId, bills, form]);

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
      form.reset();
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Student</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Search student with balance..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.profile.firstName} {s.profile.lastName} - GHS{" "}
                          {Number(s.outstandingBalance).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Bill to Pay</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!selectedStudentId || bills.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outstanding invoice" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bills.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.feeStructure?.name || b.billNumber} (Bal: GHS{" "}
                          {Number(b.balanceAmount).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (GHS)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="MOBILE_MONEY">
                          Mobile Money
                        </SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ref Number (Momo/Bank Txn ID)</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any receipt remarks..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
