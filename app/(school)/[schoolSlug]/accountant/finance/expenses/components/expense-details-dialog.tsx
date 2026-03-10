"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  CreditCard, 
  FileText, 
  User, 
  Tag, 
  Banknote,
  Info 
} from "lucide-react";

interface ExpenseDetailsDialogProps {
  expense: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseDetailsDialog({
  expense,
  open,
  onOpenChange,
}: ExpenseDetailsDialogProps) {
  if (!expense) return null;

  const DetailRow = ({ icon: Icon, label, value, className = "" }: any) => (
    <div className={`flex items-start gap-3 py-2 ${className}`}>
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span className="text-sm font-semibold">{value || "N/A"}</span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-primary/10 rounded-full">
              <Banknote className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Expense Details</DialogTitle>
              <DialogDescription>
                Full transaction information from records.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Header Section with Amount */}
          <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col items-center justify-center gap-1 text-center">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Total Amount
            </span>
            <span className="text-3xl font-bold text-red-600">
              GH₵{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <Badge variant="secondary" className="mt-1">
              {expense.registryCategory?.name || expense.customCategory?.name || "General Expenditure"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-1">
            <DetailRow
              icon={Calendar}
              label="Transaction Date"
              value={format(new Date(expense.date), "EEEE, MMMM do, yyyy")}
              className="col-span-2"
            />
            
            <DetailRow
              icon={Info}
              label="Description"
              value={expense.description}
              className="col-span-2"
            />

            <Separator className="col-span-2 my-2" />

            <DetailRow
              icon={User}
              label="Payee / Beneficiary"
              value={expense.payee}
            />

            <DetailRow
              icon={FileText}
              label="Voucher Num (POV)"
              value={expense.voucherNumber}
            />

            <DetailRow
              icon={CreditCard}
              label="Payment Method"
              value={expense.paymentMethod}
            />

            {expense.checkNumber && (
              <DetailRow
                icon={CreditCard}
                label="Check Number"
                value={expense.checkNumber}
              />
            )}

            {expense.referenceNumber && (
              <DetailRow
                icon={Tag}
                label="Reference / ID"
                value={expense.referenceNumber}
              />
            )}

            <Separator className="col-span-2 my-2" />

            <DetailRow
              icon={User}
              label="Recorded By"
              value={expense.recordedBy?.name}
              className="col-span-2"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
