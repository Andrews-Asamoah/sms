"use client";

import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, School, CheckCircle2, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetchers";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const paymentSchema = z
  .object({
    studentId: z.string().min(1, "Please select a student"),
    billId: z.string().min(1, "Please select a bill"),
    paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CHEQUE"]),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
    items: z
      .array(
        z.object({
          billItemId: z.string(),
          amount: z.number().min(0),
          selected: z.boolean(),
          description: z.string(),
          balance: z.number(),
        }),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod !== "CASH" && !data.referenceNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reference number is required for this payment method",
        path: ["referenceNumber"],
      });
    }
  });

type FormValues = z.infer<typeof paymentSchema>;

interface Student {
  id: string;
  studentId: string;
  profile: { firstName: string; lastName: string };
  class?: { id: string; name: string };
  outstandingBalance: number;
}

interface Class {
  id: string;
  name: string;
}

interface Bill {
  id: string;
  billNumber: string;
  balanceAmount: number;
  totalAmount: number;
  paidAmount: number;
  feeStructure?: { name: string };
  items: {
    id: string;
    description: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
  }[];
}

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialStudentId?: string;
  initialAmount?: number;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  onSuccess,
  initialStudentId,
}: RecordPaymentDialogProps) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  // ── SWR: Classes — cached 10 min, no re-fetch on focus (classes rarely change)
  const { data: classes = [] } = useSWR<Class[]>(
    open ? `/api/schools/${schoolSlug}/classes` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600_000 }
  );

  // ── SWR: ALL students fetched ONCE, cached 2 min.
  // Class filter and search are applied CLIENT-SIDE — zero extra DB calls.
  const { data: allStudents = [], isLoading: isLoadingStudents } = useSWR<Student[]>(
    open ? `/api/schools/${schoolSlug}/finance/students/outstanding` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120_000 }
  );

  const students = allStudents.filter((s) => {
    const matchesClass = selectedClassId === "all" || s.class?.id === selectedClassId;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.profile.firstName.toLowerCase().includes(q) ||
      s.profile.lastName.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q);
    return matchesClass && matchesSearch;
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
  } = useForm<FormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      studentId: initialStudentId || "",
      billId: "",
      paymentMethod: "CASH",
      referenceNumber: "",
      notes: "",
      items: [],
    },
  });

  const { fields } = useFieldArray({ control, name: "items" });

  const studentId = watch("studentId");
  const billId = watch("billId");
  const paymentMethod = watch("paymentMethod");

  // ── SWR: Bills for selected student — cached 30s, invalidated after payment
  const billsKey = studentId
    ? `/api/schools/${schoolSlug}/finance/invoices?studentId=${studentId}&status=PENDING,PARTIALLY_PAID`
    : null;

  const { data: bills = [] } = useSWR<Bill[]>(
    billsKey,
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 30_000 }
  );

  // Keep a stable ref to bills so the item-population effect doesn't
  // re-run every time SWR returns a new array reference for the same data.
  const billsRef = useRef<Bill[]>(bills);
  billsRef.current = bills;

  // Populate form items when the selected bill changes (NOT when bills re-fetches)
  useEffect(() => {
    if (billId) {
      const b = billsRef.current.find((x) => x.id === billId);
      if (b) {
        setValue("items", b.items.map(item => ({
          billItemId: item.id,
          description: item.description,
          amount: Number(item.balanceAmount),
          balance: Number(item.balanceAmount),
          selected: true,
        })));
      }
    } else {
      setValue("items", []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billId, setValue]); // bills intentionally excluded — accessed via billsRef


  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);

    // Derive total from items — never trust a hidden field
    const actualSum =
      data.items?.filter(i => i.selected).reduce((acc, i) => acc + (Number(i.amount) || 0), 0) || 0;

    try {
      const res = await fetch(`/api/schools/${schoolSlug}/finance/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, amount: actualSum }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to record payment");
      }

      toast.success("Payment recorded successfully");
      // Invalidate bills cache so the next open shows up-to-date balances
      if (billsKey) globalMutate(billsKey);
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

        <ScrollArea className="max-h-[80vh] px-1">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-6 px-1">
            {/* Class filter */}
            <FieldGroup className="border-b pb-4 mb-4">
              <Field>
                <FieldLabel className="text-xs uppercase text-muted-foreground flex items-center mb-2">
                  <School className="w-3 h-3 mr-1" /> Initial Class Filter
                </FieldLabel>
                <Select
                  value={selectedClassId}
                  onValueChange={(val) => {
                    setSelectedClassId(val);
                    setValue("studentId", "");
                    setValue("billId", "");
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Narrow down results before searching.
                </p>
              </Field>
            </FieldGroup>

            <FieldGroup>
              {/* Student combobox */}
              <Field data-invalid={!!errors.studentId}>
                <FieldLabel htmlFor="pmt-student">Select Student</FieldLabel>
                <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isComboboxOpen}
                      className="w-full justify-between h-12 text-left font-normal"
                      disabled={isLoadingStudents}
                    >
                      {studentId ? (
                        <div className="flex flex-col items-start overflow-hidden">
                          <span className="truncate w-full font-medium">
                            {students.find((s) => s.id === studentId)?.profile.firstName}{" "}
                            {students.find((s) => s.id === studentId)?.profile.lastName}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate w-full">
                            ID: {students.find((s) => s.id === studentId)?.studentId}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {isLoadingStudents ? "Loading students..." : "Search by name or ID..."}
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Type name or ID to search..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        {isLoadingStudents && (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm">Fetching...</span>
                          </div>
                        )}
                        {!isLoadingStudents && students.length === 0 && (
                          <CommandEmpty>No students found.</CommandEmpty>
                        )}
                        <CommandGroup>
                          {students.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={s.id}
                              onSelect={() => {
                                setValue("studentId", s.id);
                                setValue("billId", "");
                                setIsComboboxOpen(false);
                              }}
                              className="flex flex-col items-start py-2 px-3 cursor-pointer"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium text-sm">
                                  {s.profile.firstName} {s.profile.lastName}
                                </span>
                                {studentId === s.id && <Check className="h-3 w-3 text-primary" />}
                              </div>
                              <span className="text-[10px] text-muted-foreground leading-tight">
                                {s.studentId} • {s.class?.name || "No Class"} • GHS {Number(s.outstandingBalance).toFixed(2)}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FieldError errors={[errors.studentId]} />
              </Field>

              {/* Bill selector */}
              <Field data-invalid={!!errors.billId}>
                <FieldLabel htmlFor="pmt-bill">Select Bill to Pay</FieldLabel>
                <Select
                  onValueChange={(val) => setValue("billId", val)}
                  value={billId}
                  disabled={!studentId || bills.length === 0}
                >
                  <SelectTrigger id="pmt-bill">
                    <SelectValue placeholder="Select outstanding invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {bills.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.feeStructure?.name || b.billNumber} (Bal: GHS {Number(b.balanceAmount).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.billId]} />
              </Field>

              {/* Payment distribution per item */}
              {billId && fields.length > 0 && (
                <div className="space-y-3 bg-muted/30 p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Payment Distribution
                    </h4>
                    <Badge variant="secondary" className="text-[10px]">
                      {fields.length} Items Found
                    </Badge>
                  </div>

                  <ScrollArea className="h-[200px] pr-4">
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-start gap-4 p-2 rounded hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={`item-cb-${index}`}
                            className="mt-1"
                            checked={watch(`items.${index}.selected`)}
                            onCheckedChange={(checked) => {
                              setValue(`items.${index}.selected`, !!checked);
                              setValue(`items.${index}.amount`, checked ? field.balance : 0);
                            }}
                          />
                          <div className="flex-1 space-y-1">
                            <label htmlFor={`item-cb-${index}`} className="text-sm font-medium cursor-pointer">
                              {field.description}
                            </label>
                            <div className="text-[11px] text-muted-foreground">
                              Balance: GHS {field.balance.toFixed(2)}
                            </div>
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              step="0.01"
                              className="h-8 text-xs text-right"
                              placeholder="Amount"
                              disabled={!watch(`items.${index}.selected`)}
                              {...register(`items.${index}.amount` as const, { valueAsNumber: true })}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="pt-2 border-t flex justify-between items-center px-1">
                    <span className="text-xs font-medium">Sum of distributed:</span>
                    <span className="text-xs font-bold text-primary">
                      GHS {watch("items")?.filter(i => i.selected).reduce((acc, i) => acc + (i.amount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Method */}
              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={!!errors.paymentMethod}>
                  <FieldLabel htmlFor="pmt-method">Method</FieldLabel>
                  <Select
                    onValueChange={(val) => setValue("paymentMethod", val as "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CHEQUE")}
                    value={paymentMethod}
                  >
                    <SelectTrigger id="pmt-method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[errors.paymentMethod]} />
                </Field>
              </div>

              <Field data-invalid={!!errors.referenceNumber}>
                <FieldLabel htmlFor="pmt-ref">
                  Ref Number
                  {paymentMethod === "CASH" ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(Optional)</span>
                  ) : (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </FieldLabel>
                <Input
                  id="pmt-ref"
                  placeholder={
                    paymentMethod === "CASH"
                      ? "Optional for cash payments"
                      : "Transaction / Reference ID"
                  }
                  {...register("referenceNumber")}
                />
                <FieldError errors={[errors.referenceNumber]} />
              </Field>

              <Field data-invalid={!!errors.notes}>
                <FieldLabel htmlFor="pmt-notes">Notes (Optional)</FieldLabel>
                <Textarea
                  id="pmt-notes"
                  placeholder="Any receipt remarks..."
                  rows={2}
                  {...register("notes")}
                />
                <FieldError errors={[errors.notes]} />
              </Field>
            </FieldGroup>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
