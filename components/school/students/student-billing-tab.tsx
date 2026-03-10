"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, FileText } from "lucide-react";
import { RecordPaymentSheet } from "@/components/school/finance/record-payment-sheet";

interface Bill {
  id: string;
  billNumber: string;
  totalAmount: any;
  paidAmount: any;
  balanceAmount: any;
  status: string;
  createdAt: Date | string;
}

interface StudentBillingTabProps {
  student: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
    bills: Bill[];
  };
  school: {
    currency: string;
  };
  schoolSlug: string;
}

export function StudentBillingTab({
  student,
  school,
  schoolSlug,
}: StudentBillingTabProps) {
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handlePay = (billId: string) => {
    setSelectedBillId(billId);
    setIsSheetOpen(true);
  };

  const formatAmount = (val: any) => {
    return Number(val || 0).toFixed(2);
  };

  return (
    <div className="space-y-4">
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Recent Bills</CardTitle>
          <CardDescription>Latest billing information</CardDescription>
        </CardHeader>
        <CardContent>
          {student.bills.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No bills generated yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {student.bills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{bill.billNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(bill.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold">
                        {school.currency} {formatAmount(bill.totalAmount)}
                      </p>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {bill.status.replace("_", " ")}
                      </Badge>
                    </div>

                    {(bill.status === "PENDING" ||
                      bill.status === "PARTIALLY_PAID") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handlePay(bill.id)}
                      >
                        <Wallet className="h-4 w-4 mr-1" />
                        Pay
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RecordPaymentSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        studentId={student.id}
        studentName={`${student.profile.firstName} ${student.profile.lastName}`}
        schoolSlug={schoolSlug}
        initialBillId={selectedBillId || undefined}
        onSuccess={() => {
          // Success logic if needed, router.refresh() is already in the sheet
        }}
      />
    </div>
  );
}
