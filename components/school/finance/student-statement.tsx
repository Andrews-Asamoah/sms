"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
} from "lucide-react";

interface StatementProps {
  studentId: string;
  schoolSlug: string;
}

export function StudentStatement({ studentId, schoolSlug }: StatementProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatement() {
      try {
        const res = await fetch(
          `/api/schools/${schoolSlug}/finance/students/${studentId}/statement`,
        );
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Statement Load Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatement();
  }, [studentId, schoolSlug]);

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!data)
    return (
      <div className="p-8 text-center text-muted-foreground">
        No statement found.
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold">
              Total Billed
            </CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              GHS {Number(data.summary.totalBilled).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30 text-green-700 dark:text-green-400">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold text-green-600 dark:text-green-500">
              Total Paid
            </CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              GHS {Number(data.summary.totalPaid).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30 text-red-700 dark:text-red-400">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold text-red-600 dark:text-red-500">
              Current Balance
            </CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              GHS {Number(data.summary.balance).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            Detailed list of invoices and their items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {data.bills.map((bill: any) => (
              <div key={bill.id} className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 flex justify-between items-center text-sm font-medium border-b">
                  <div className="flex gap-4">
                    <span>{bill.billNumber}</span>
                    <span className="text-muted-foreground font-normal">
                      {new Date(bill.issuedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={bill.status === "PAID" ? "default" : "outline"}
                    >
                      {bill.status}
                    </Badge>
                    <span>GHS {Number(bill.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background hover:bg-background">
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bill.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="py-2 text-sm">
                          {item.description}
                        </TableCell>
                        <TableCell className="py-2 text-right text-sm">
                          GHS {Number(item.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2 text-right text-sm text-green-600">
                          GHS {Number(item.paidAmount).toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2 text-right text-sm font-semibold">
                          GHS {Number(item.balanceAmount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Record of all payments made and their allocations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Receipt #</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Allocated To</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {new Date(p.paymentDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {p.paymentNumber}
                  </TableCell>
                  <TableCell className="text-xs uppercase">
                    {p.paymentMethod}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.paymentItems.map((pi: any) => (
                        <Badge
                          key={pi.id}
                          variant="secondary"
                          className="text-[10px] py-0"
                        >
                          {pi.billItem.description}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    GHS {Number(p.amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              {data.payments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
