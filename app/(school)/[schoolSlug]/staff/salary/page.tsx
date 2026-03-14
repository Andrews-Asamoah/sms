"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Loader2, 
  Wallet, 
  FileText, 
  Download, 
  TrendingUp,
  CreditCard,
  History,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SalaryStats {
  staffNumber: string | null;
  basicSalary: number;
  allowances: number;
  grossSalary: number;
  ssnitEmployee: number;
  ssnitEmployer: number;
  incomeTax: number;
  otherDeductions: number;
  netSalary: number;
}

interface Payslip {
  id: string;
  netSalary: number;
  paymentStatus: string;
  paidAt: string | null;
  payrollRecord: {
    month: number;
    year: number;
  };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function StaffSalaryPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [stats, setStats] = useState<SalaryStats | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, payslipsRes] = await Promise.all([
        fetch(`/api/schools/${schoolSlug}/staff/salary/stats`),
        fetch(`/api/schools/${schoolSlug}/staff/salary/payslips`)
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (payslipsRes.ok) setPayslips(await payslipsRes.json());
    } catch (error) {
      console.error("Failed to fetch salary data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolSlug]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="My Salary & Payslips"
        description="View your salary structure and download monthly payslips."
      >
        <div className="flex flex-col items-end">
          <Badge variant="outline" className="text-muted-foreground">
             Staff ID: {stats?.staffNumber || "N/A"}
          </Badge>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
            {format(new Date(), "MMMM yyyy")} Structure
          </p>
        </div>
      </DashboardPageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Basic Salary</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.basicSalary || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Foundational monthly pay</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Salary</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.grossSalary || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total before deductions</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Deductions</CardTitle>
            <CreditCard className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency((stats?.ssnitEmployee || 0) + (stats?.incomeTax || 0) + (stats?.otherDeductions || 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">SSNIT, PAYE, and others</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 dark:bg-green-950/10 border-green-100 dark:border-green-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Net Salary</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center text-[8px] text-white italic">GH</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats?.netSalary || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Take-home amount</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Salary Breakdown</CardTitle>
            <CardDescription>Estimated monthly structure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-dashed">
              <span className="text-sm text-muted-foreground">Basic Pay</span>
              <span className="font-medium">{formatCurrency(stats?.basicSalary || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dashed">
              <span className="text-sm text-muted-foreground">Allowances</span>
              <span className="font-medium text-green-600">+{formatCurrency(stats?.allowances || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dashed">
              <span className="text-sm text-muted-foreground">SSNIT (5.5%)</span>
              <span className="font-medium text-red-500">-{formatCurrency(stats?.ssnitEmployee || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dashed">
              <span className="text-sm text-muted-foreground">Income Tax (PAYE)</span>
              <span className="font-medium text-red-500">-{formatCurrency(stats?.incomeTax || 0)}</span>
            </div>
            {stats?.otherDeductions && stats.otherDeductions > 0 ? (
              <div className="flex justify-between items-center py-2 border-b border-dashed">
                <span className="text-sm text-muted-foreground">Other Deductions</span>
                <span className="font-medium text-red-500">-{formatCurrency(stats?.otherDeductions || 0)}</span>
              </div>
            ) : null}
            <div className="flex justify-between items-center py-3 bg-muted/30 px-3 rounded-lg mt-4">
              <span className="font-bold">Total Net Pay</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(stats?.netSalary || 0)}</span>
            </div>
            
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground mt-4 bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-md">
              <Info className="h-3.5 w-3.5 mt-0.5 text-blue-500" />
              <p>This breakdown is based on Ghana's statutory rates. Actual amounts may vary slightly due to tax reliefs or specific school policies.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Payslip History</CardTitle>
                <CardDescription>Download your past monthly payslips</CardDescription>
              </div>
              <History className="h-5 w-5 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            {payslips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No payslips generated yet.</p>
                <p className="text-xs text-muted-foreground italic">Payslips appear here once payroll is finalized each month.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-4 py-3 text-left font-medium">Month/Year</th>
                      <th className="px-4 py-3 text-left font-medium">Net Amount</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payslips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          {MONTHS[slip.payrollRecord.month - 1]} {slip.payrollRecord.year}
                        </td>
                        <td className="px-4 py-3">{formatCurrency(slip.netSalary)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20">
                            Paid
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 gap-1.5"
                            onClick={() => window.print()} // Fallback for now, could be a real PDF download
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
