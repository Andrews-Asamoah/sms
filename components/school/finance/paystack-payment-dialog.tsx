"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PaystackPop from "@paystack/inline-js";

interface PaystackPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bill: {
    id: string;
    studentId: string;
    internalStudentId: string;
    studentName: string;
    billNumber: string;
    balanceAmount: number;
    totalAmount: number;
  };
  currency: string;
  schoolSlug: string;
}

export function PaystackPaymentDialog({
  isOpen,
  onClose,
  onSuccess,
  bill,
  currency,
  schoolSlug,
}: PaystackPaymentDialogProps) {
  const [amount, setAmount] = useState<string>(bill.balanceAmount.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handlePay = async () => {
    setError("");
    setSuccessMessage("");
    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    if (paymentAmount > bill.balanceAmount) {
      setError(`Amount cannot exceed the remaining balance of ${currency} ${bill.balanceAmount.toFixed(2)}`);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Initialize payment on our backend
      const initRes = await fetch(`/api/schools/${schoolSlug}/finance/payments/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: bill.internalStudentId,
          billId: bill.id,
          amount: paymentAmount,
        }),
      });

      const initData = await initRes.json();

      if (!initRes.ok) {
        throw new Error(initData.error || "Failed to initialize payment.");
      }

      // 2. Open Paystack Inline Popup
      const paystack = new PaystackPop();
      
      paystack.newTransaction({
        key: initData.publicKey,
        email: initData.email,
        amount: initData.amount * 100, // Paystack expects lowest denomination (pesewas/kobo)
        reference: initData.reference,
        currency: "GHS", // Or use the school's currency, assuming GHS for now
        metadata: {
          custom_fields: [
            { display_name: "Charge Type", variable_name: "type", value: "student_fee" },
            { display_name: "School", variable_name: "schoolSlug", value: schoolSlug },
            { display_name: "Student ID", variable_name: "studentId", value: bill.studentId },
            { display_name: "Bill ID", variable_name: "billId", value: bill.id }
          ]
        },
        onSuccess: async (transaction: any) => {
          // 3. Verify payment on our backend
          try {
            const verifyRes = await fetch(`/api/schools/${schoolSlug}/finance/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reference: transaction.reference,
                studentId: bill.internalStudentId,
                billId: bill.id,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            setSuccessMessage(`Payment of ${currency} ${paymentAmount.toFixed(2)} was successful! Receipt: ${verifyData.payment.paymentNumber}`);
            
            // Wait a moment then trigger success callback
            setTimeout(() => {
              onSuccess();
              onClose();
            }, 3000);

          } catch (verifyErr: any) {
            console.error("Verification error:", verifyErr);
            setError(verifyErr.message || "Payment completed but verification failed. Please contact the school.");
            setIsLoading(false);
          }
        },
        onCancel: () => {
          setIsLoading(false);
          // Optional: Add toast for cancellation
        },
        onError: (err: any) => {
          console.error("Paystack error:", err);
          setError("An error occurred during payment processing.");
          setIsLoading(false);
        }
      });

    } catch (err: any) {
      console.error("Payment initialization error:", err);
      setError(err.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pay Fees Online</DialogTitle>
          <DialogDescription>
            Securely pay fees for {bill.studentName} via Paystack.
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="font-medium text-green-700 dark:text-green-400">{successMessage}</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bill Number</span>
                <span className="font-medium">{bill.billNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Bill</span>
                <span className="font-medium">{currency} {bill.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold border-t pt-2 mt-2">
                <span>Remaining Balance</span>
                <span className="text-destructive">{currency} {bill.balanceAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Amount to Pay ({currency})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                max={bill.balanceAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
                className="font-medium text-lg"
              />
              <p className="text-xs text-muted-foreground">
                You can pay partially by editing this amount. Minimum is 1.
              </p>
            </div>
          </div>
        )}

        {!successMessage && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handlePay} disabled={isLoading} className="bg-primary">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay {currency} {Number(amount) ? Number(amount).toFixed(2) : "0.00"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
