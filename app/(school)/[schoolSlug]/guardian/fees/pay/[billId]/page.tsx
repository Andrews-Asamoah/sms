"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PaystackPop from "@paystack/inline-js";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const schoolSlug = params.schoolSlug as string;
  const billId = params.billId as string;

  const [bill, setBill] = useState<any>(null);
  const [currency, setCurrency] = useState("GHS");
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function fetchBillDetails() {
      try {
        const response = await fetch(`/api/schools/${schoolSlug}/finance/bills/${billId}`);
        if (!response.ok) throw new Error("Failed to fetch bill details");
        const data = await response.json();
        setBill(data.bill);
        setCurrency(data.currency || "GHS");
        setAmount(data.bill.balanceAmount.toString());
      } catch (err: any) {
        setError(err.message || "An error occurred while loading bill details.");
      } finally {
        setIsLoading(false);
      }
    }

    if (schoolSlug && billId) {
      fetchBillDetails();
    }
  }, [schoolSlug, billId]);

  const handlePay = async () => {
    setError("");
    setSuccessMessage("");
    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    if (paymentAmount > bill.balanceAmount) {
      setError(`Amount cannot exceed the remaining balance.`);
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Initialize payment on our backend
      const initRes = await fetch(`/api/schools/${schoolSlug}/finance/payments/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: bill.studentId, // This should be the internal student ID
          billId: bill.id,
          amount: paymentAmount,
        }),
      });

      const initData = await initRes.json();

      if (!initRes.ok) {
        throw new Error(initData.error || "Failed to initialize payment.");
      }

      // 2. Open Paystack Inline
      const paystack = new PaystackPop();
      
      paystack.newTransaction({
        key: initData.publicKey,
        email: initData.email,
        amount: initData.amount * 100,
        reference: initData.reference,
        currency: "GHS", 
        metadata: {
          custom_fields: [
            { display_name: "Charge Type", variable_name: "type", value: "student_fee" },
            { display_name: "School", variable_name: "schoolSlug", value: schoolSlug },
            { display_name: "Student ID", variable_name: "studentId", value: bill.student.studentId },
            { display_name: "Bill ID", variable_name: "billId", value: bill.id }
          ]
        },
        onSuccess: async (transaction: any) => {
          try {
            const verifyRes = await fetch(`/api/schools/${schoolSlug}/finance/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reference: transaction.reference,
                studentId: bill.studentId,
                billId: bill.id,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            setSuccessMessage(`Payment successful! Receipt: ${verifyData.payment.paymentNumber}`);
            
            setTimeout(() => {
              router.push(`/${schoolSlug}/guardian/fees`);
            }, 3000);

          } catch (verifyErr: any) {
            console.error("Verification error:", verifyErr);
            setError(verifyErr.message || "Payment completed but verification failed. Please contact the school.");
            setIsProcessing(false);
          }
        },
        onCancel: () => {
          setIsProcessing(false);
        },
        onError: (err: any) => {
          console.error("Paystack error:", err);
          setError("An error occurred during payment processing.");
          setIsProcessing(false);
        }
      });

    } catch (err: any) {
      console.error("Payment initialization error:", err);
      setError(err.message || "An unexpected error occurred.");
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !bill) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="link" asChild className="mt-4">
          <Link href={`/${schoolSlug}/guardian/fees`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fees
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${schoolSlug}/guardian/fees`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Make Payment</h1>
      </div>

      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Fee Payment for {bill?.student?.profile?.firstName} {bill?.student?.profile?.lastName}</CardTitle>
          <CardDescription>
            Confirm the amount you wish to pay for Bill #{bill?.billNumber}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h2 className="text-xl font-semibold text-green-700">Payment Successful!</h2>
              <p className="text-muted-foreground">{successMessage}</p>
              <p className="text-sm">Redirecting you back to your fees portal...</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Bill Number</span>
                  <span className="font-semibold">{bill?.billNumber}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Total Bill Amount</span>
                  <span className="font-semibold">{currency} {bill?.totalAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="font-semibold text-green-600">{currency} {bill?.paidAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold">Remaining Balance</span>
                  <span className="text-2xl font-bold text-destructive">{currency} {bill?.balanceAmount?.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="amount" className="text-base">Amount to Pay Now ({currency})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">{currency}</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    max={bill?.balanceAmount}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isProcessing}
                    className="pl-14 py-6 text-xl font-bold focus-visible:ring-primary"
                  />
                </div>
                <p className="text-sm text-muted-foreground italic">
                  * You can edit this amount for partial payments. Minimum amount is 1.00
                </p>
              </div>
            </>
          )}
        </CardContent>
        {!successMessage && (
          <CardFooter className="flex flex-col gap-3">
            <Button 
              onClick={handlePay} 
              disabled={isProcessing} 
              className="w-full py-6 text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
            >
              {isProcessing && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Pay {currency} {Number(amount) ? Number(amount).toFixed(2) : "0.00"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Payments are processed securely via Paystack. Your credit/debit card information is never stored on our servers.
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
