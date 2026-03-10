"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Download, Filter, FileText, PieChart, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function ReportsManager() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  // Fetch Report Data on mount and when schoolSlug changes
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        // Uses global working context from cookies
        const res = await fetch(`/api/schools/${schoolSlug}/finance/overview`);
        if (res.ok) {
          setReportData(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch report data", error);
      } finally {
        setLoading(false);
      }
    };

    if (schoolSlug) {
      fetchReportData();
    }
  }, [schoolSlug]);

  const formatter = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: reportData?.currency || "GHS",
  });

  const handleExportStatement = async () => {
    if (!reportData) return;
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { FinancialStatementPDF } = await import("./financial-statement-pdf");

      const blob = await pdf(
        <FinancialStatementPDF 
          data={reportData} 
          schoolName={schoolSlug.toUpperCase().replace("-", " ")} 
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Financial_Statement_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export statement:", error);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Financial Reports"
        description="Comprehensive analysis of income, expenses, and payroll."
      />
      {/* Period Indicator */}
      <div className="flex items-center justify-between bg-card/40 p-4 rounded-lg border-none shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-8 px-3 text-xs bg-primary/5 text-primary border-primary/20">
            Current View: {reportData?.currentYearName || "All Time"} 
            {reportData?.currentTermName ? ` — ${reportData.currentTermName}` : ""}
          </Badge>
          <span className="text-xs text-muted-foreground italic">
            (Controlled by sidebar working year/term)
          </span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExportStatement}
          disabled={loading || !reportData}
        >
          <Download className="mr-2 h-3.5 w-3.5" />
          Export Statement
        </Button>
      </div>

      <Tabs defaultValue="income-statement" className="space-y-4">
        <TabsList className="bg-muted/50 border">
          <TabsTrigger value="income-statement" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Income Statement
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Categorized Breakdown
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Transaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income-statement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatter.format(reportData?.revenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Income collected in selected period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatter.format(reportData?.expenses || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Operating costs and purchases
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(reportData?.revenue || 0) - (reportData?.expenses || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatter.format((reportData?.revenue || 0) - (reportData?.expenses || 0))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue minus Expenses
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Income Statement Breakdown</CardTitle>
              <CardDescription>Line-by-line summary of revenue and obligations.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account / Metric</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-bold py-4">REVENUE</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Collected Fee Payments</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {formatter.format(reportData?.revenue || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b-2">
                    <TableCell className="pl-8">Outstanding Balance (Receivables)</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatter.format(reportData?.outstanding || 0)}
                    </TableCell>
                  </TableRow>
                  
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-bold py-4">EXPENSES & PAYROLL</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Operating Expenses</TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      -{formatter.format(reportData?.expenses || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Staff Payroll (Gross)</TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      -{formatter.format(reportData?.payroll?.gross || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Income by Category</CardTitle>
                <CardDescription>Breakdown of collected payments mapped to Fee Item Categories.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!reportData?.revenueBreakdown?.length ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                          No categorized income found for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.revenueBreakdown.map((rev: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{rev.name}</TableCell>
                          <TableCell className="text-right text-emerald-600">{formatter.format(rev.amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>Breakdown of expenditures mapped to standard Categories.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!reportData?.expenseBreakdown?.length ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                          No categorized expenses found for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.expenseBreakdown.map((exp: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{exp.name}</TableCell>
                          <TableCell className="text-right text-orange-600">{formatter.format(exp.amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenditures</CardTitle>
              <CardDescription>Latest approved expenses in the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell>
                    </TableRow>
                  ) : !reportData?.recentTransactions?.length ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No recent transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.recentTransactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>{format(new Date(tx.date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-medium">{tx.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-orange-600">
                          -{formatter.format(Number(tx.amount))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
