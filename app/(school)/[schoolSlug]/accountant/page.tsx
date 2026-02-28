"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Package,
  ArrowUpRight,
  Receipt,
  Users,
  Plus,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnnouncementWidget } from "@/components/dashboard/announcement-widget";
import { format } from "date-fns";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DashboardStats {
  revenue: number;
  outstanding: number;
  expenses: number;
  inventoryCount: number;
  lowStockCount: number;
  recentTransactions: any[];
  currency: string;
}

export default function AccountantDashboardPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // In a real app, this would be a single optimized endpoint
        const [financeRes, inventoryRes] = await Promise.all([
          fetch(`/api/schools/${schoolSlug}/finance/overview`),
          fetch(`/api/schools/${schoolSlug}/inventory`),
        ]);

        const financeData = await financeRes.json();
        const inventoryData = await inventoryRes.json();

        setStats({
          ...financeData,
          inventoryCount: inventoryData.length,
          lowStockCount: inventoryData.filter(
            (i: any) => i.quantity <= i.minQuantity,
          ).length,
          currency: financeData.currency || "GHS",
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [schoolSlug]);

  if (loading) return <DashboardSkeleton />;

  const formatter = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: stats?.currency || "GHS",
  });

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Accountant Dashboard
          </h2>
          <p className="text-muted-foreground">
            Financial overview and quick actions for your school.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href={`/${schoolSlug}/accountant/finance/invoices`}>
              <Receipt className="mr-2 h-4 w-4" />
              Generate Invoices
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics" disabled>
            Analytics
          </TabsTrigger>
          <TabsTrigger value="reports" disabled>
            Reports
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden border-none bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatter.format(stats?.revenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1 text-emerald-600" />
                  +2.5% from last month
                </p>
              </CardContent>
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <DollarSign className="h-24 w-24" />
              </div>
            </Card>

            <Card className="relative overflow-hidden border-none bg-gradient-to-br from-red-500/10 to-red-500/5 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Outstanding Fees
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatter.format(stats?.outstanding || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-red-600 font-medium">
                  Needs attention
                </p>
              </CardContent>
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <AlertCircle className="h-24 w-24" />
              </div>
            </Card>

            <Card className="relative overflow-hidden border-none bg-gradient-to-br from-orange-500/10 to-orange-500/5 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Total Expenses
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatter.format(stats?.expenses || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Month-to-date
                </p>
              </CardContent>
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <TrendingDown className="h-24 w-24" />
              </div>
            </Card>

            <Card className="relative overflow-hidden border-none bg-gradient-to-br from-blue-500/10 to-blue-500/5 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Inventory items
                </CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.inventoryCount || 0} items
                </div>
                {stats?.lowStockCount ? (
                  <p className="text-xs text-red-600 mt-1 font-medium bg-red-100 w-fit px-1 rounded">
                    {stats.lowStockCount} items low stock
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Stock levels healthy
                  </p>
                )}
              </CardContent>
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <Package className="h-24 w-24" />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4 shadow-sm border-none bg-card/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>
                  Comparison of revenue vs expenses this term.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Revenue",
                        value: stats?.revenue || 0,
                        color: "#10b981",
                      },
                      {
                        name: "Expenses",
                        value: stats?.expenses || 0,
                        color: "#f97316",
                      },
                      {
                        name: "Outstanding",
                        value: stats?.outstanding || 0,
                        color: "#ef4444",
                      },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickFormatter={(value) => `GH₵${value}`}
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: any) => [formatter.format(value), ""]}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                      {[
                        {
                          name: "Revenue",
                          value: stats?.revenue || 0,
                          color: "#10b981",
                        },
                        {
                          name: "Expenses",
                          value: stats?.expenses || 0,
                          color: "#f97316",
                        },
                        {
                          name: "Outstanding",
                          value: stats?.outstanding || 0,
                          color: "#ef4444",
                        },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 shadow-sm border-none bg-card/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Recent Expenditures</CardTitle>
                <CardDescription>
                  Latest processed school expenses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.recentTransactions?.length === 0 && (
                    <div className="text-sm text-center py-10 text-muted-foreground italic">
                      No recent expenses recorded.
                    </div>
                  )}
                  {stats?.recentTransactions?.map((tx: any) => (
                    <div key={tx.id} className="flex items-center gap-4">
                      <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {tx.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.date), "MMM d, yyyy")} •{" "}
                          {tx.recordedBy?.name || "System"}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-orange-600">
                        -{formatter.format(Number(tx.amount))}
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" className="w-full text-xs" asChild>
                    <Link href={`/${schoolSlug}/accountant/expenses`}>
                      View All Activity
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-4 space-y-4">
              <Card className="shadow-sm border-none bg-card/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="justify-start h-16 border-dashed hover:border-primary hover:bg-primary/5 transition-all group"
                    asChild
                  >
                    <Link href={`/${schoolSlug}/accountant/expenses`}>
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center mr-3 group-hover:bg-primary/20 transition-colors">
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-foreground">
                          Add Expense
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Record new payment
                        </div>
                      </div>
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-16 border-dashed hover:border-primary hover:bg-primary/5 transition-all group"
                    asChild
                  >
                    <Link href={`/${schoolSlug}/accountant/inventory`}>
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center mr-3 group-hover:bg-primary/20 transition-colors">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-foreground">
                          Inventory
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Manage school stock
                        </div>
                      </div>
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-16 border-dashed hover:border-primary hover:bg-primary/5 transition-all group"
                    asChild
                  >
                    <Link href={`/${schoolSlug}/accountant/finance/payments`}>
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center mr-3 group-hover:bg-primary/20 transition-colors">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-foreground">
                          Record Fee
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Student fee payment
                        </div>
                      </div>
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-16 border-dashed hover:border-primary hover:bg-primary/5 transition-all group"
                    asChild
                  >
                    <Link href={`/${schoolSlug}/accountant/finance/reports`}>
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center mr-3 group-hover:bg-primary/20 transition-colors">
                        <BarChart3 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-foreground">
                          Reports
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Financial status
                        </div>
                      </div>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <AnnouncementWidget />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <Skeleton className="h-10 w-[250px]" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-7">
        <Skeleton className="h-[400px] col-span-4" />
        <Skeleton className="h-[400px] col-span-3" />
      </div>
    </div>
  );
}
