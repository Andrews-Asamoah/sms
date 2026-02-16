"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils"; // Assuming utils exists, or native Intl
import { Skeleton } from "@/components/ui/skeleton";

interface FinanceStats {
  currency: string;
  revenue: number;
  outstanding: number;
  expenses: number;
  recentTransactions: any[];
}

export default function FinanceDashboardPage() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/schools/${schoolSlug}/finance/overview`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch finance stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [schoolSlug]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!stats) return <div>Failed to load data.</div>;

  const formatter = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: stats.currency,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Finance Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatter.format(stats.revenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total collected fees
            </p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Fees
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatter.format(stats.outstanding)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unpaid student balances
            </p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatter.format(stats.expenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Operational costs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section could go here */}
      {/* Charts could go here */}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-[200px]" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
      </div>
    </div>
  );
}
