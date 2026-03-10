"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

interface PayslipClientProps {
  recordId: string;
  month: number;
  year: number;
  status: "DRAFT" | "APPROVED" | "PAID" | "CANCELLED";
  totalGross: string;
  totalNet: string;
}

interface Payslip {
  id: string;
  teacher?: { profile: { firstName: string; lastName: string } };
  staff?: { profile: { firstName: string; lastName: string } };
  basicSalary: string;
  allowances: string;
  grossSalary: string;
  ssnitEmployee: string;
  incomeTax: string;
  netSalary: string;
  paymentStatus: "PENDING" | "PAID";
}

export function PayslipClient({
  recordId,
  month,
  year,
  status,
  totalGross,
  totalNet,
}: PayslipClientProps) {
  const { schoolSlug } = useParams();
  const router = useRouter();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = months[month - 1];

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${schoolSlug}/finance/payroll/${recordId}/payslips`);
      const data = await res.json();
      if (data.payslips) {
        setPayslips(data.payslips);
      }
    } catch (error) {
      toast.error("Failed to load payslips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [schoolSlug, recordId]);

  const handleApprove = async () => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/schools/${schoolSlug}/finance/payroll/${recordId}/payslips`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID", paidAt: new Date().toISOString() }),
      });

      if (res.ok) {
        toast.success("Payroll marked as paid");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update payroll");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${schoolSlug as string}/accountant/finance/payroll`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Payroll Details
            </h1>
            <p className="text-muted-foreground mt-1">
              {monthName} {year} - Employees Payslips
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status !== "PAID" && (
            <Button onClick={handleApprove} disabled={updating} className="bg-emerald-600 hover:bg-emerald-700">
              {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status === "PAID" ? (
                <span className="text-emerald-500">Paid</span>
              ) : status === "APPROVED" ? (
                <span className="text-blue-500">Approved</span>
              ) : (
                <span className="text-amber-500">Draft</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              GHS {parseFloat(totalGross).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Payable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              GHS {parseFloat(totalNet).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payslips</CardTitle>
          <CardDescription>Individual breakdown for all staff</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Basic Salary</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">SSNIT (5.5%)</TableHead>
                  <TableHead className="text-right">PAYE/Tax</TableHead>
                  <TableHead className="text-right">Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((slip) => {
                  const profile = slip.teacher?.profile || slip.staff?.profile;
                  const name = profile ? `${profile.firstName} ${profile.lastName}` : "Unknown";
                  return (
                    <TableRow key={slip.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-right">
                        {parseFloat(slip.basicSalary).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(slip.grossSalary).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {parseFloat(slip.ssnitEmployee).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {parseFloat(slip.incomeTax).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {parseFloat(slip.netSalary).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={slip.paymentStatus === "PAID" ? "default" : "outline"} className={slip.paymentStatus === "PAID" ? "bg-emerald-500" : ""}>
                          {slip.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {payslips.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No payslips found for this record.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
