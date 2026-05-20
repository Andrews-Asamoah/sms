"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  Label,
  LabelList,
  RadialBar,
  RadialBarChart,
  Legend,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface EnrollmentTrendProps {
  data: { month: string; students: number }[];
}

export function EnrollmentTrendChart({ data }: EnrollmentTrendProps) {
  const chartConfig = {
    students: {
      label: "Total Students",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  return (
    <Card className="backdrop-blur-md bg-card/50 border-primary/10 shadow-sm overflow-hidden flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-xl font-bold tracking-tight">Enrollment Growth</CardTitle>
        <CardDescription>
          Visualizing student population trends over the last 6 months
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-2 sm:px-6 pb-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart 
            data={data}
            margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="fillStudents" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-students)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-students)"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              className="stroke-muted/30"
            />
            
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              className="font-semibold text-muted-foreground"
            />
            
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(val) => Math.round(Number(val)).toLocaleString()}
              className="text-xs text-muted-foreground font-medium"
            />
            
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value, name) => (
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{name}:</span>
                      <span className="font-extrabold text-foreground">{Number(value).toLocaleString()} Students</span>
                    </div>
                  )}
                />
              } 
            />
            
            <Area
              type="monotone"
              dataKey="students"
              stroke="var(--color-students)"
              fill="url(#fillStudents)"
              strokeWidth={3}
              animationDuration={1500}
              dot={{
                r: 4,
                stroke: "var(--color-students)",
                strokeWidth: 2.5,
                fill: "var(--background)",
              }}
              activeDot={{
                r: 7,
                style: {
                  fill: "var(--color-students)",
                  stroke: "var(--background)",
                  strokeWidth: 3,
                },
              }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

interface FinancialChartProps {
  data: { name: string; value: number; fill: string }[];
  currency: string;
}

export function FinancialSummaryChart({ data, currency }: FinancialChartProps) {
  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-2))",
    },
    expenses: {
      label: "Expenses",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig;

  // Custom currency formatter
  const formatCurrency = (value: number) => {
    return `${currency} ${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <Card className="backdrop-blur-md bg-card/50 border-primary/10 shadow-sm overflow-hidden flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-xl font-bold tracking-tight">Financial Status</CardTitle>
        <CardDescription>
          Overview of institutional revenue vs expenditures
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-4 pb-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <BarChart 
            data={data} 
            margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              className="stroke-muted/40"
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              className="font-semibold text-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(val) => `${currency} ${val.toLocaleString()}`}
              className="text-xs text-muted-foreground font-medium"
            />
            <ChartTooltip 
              cursor={{ fill: "var(--muted)", opacity: 0.15 }}
              content={
                <ChartTooltipContent 
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span className="text-muted-foreground capitalize">{name}:</span>
                      <span className="font-bold text-foreground">{formatCurrency(Number(value))}</span>
                    </div>
                  )}
                />
              } 
            />
            <Bar
              dataKey="value"
              radius={[10, 10, 0, 0]}
              maxBarSize={55}
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                  className="transition-all duration-300 hover:opacity-85"
                />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                offset={10}
                formatter={(val: number) => formatCurrency(val)}
                className="fill-foreground font-extrabold text-[11px] sm:text-xs"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

interface GenderDistributionProps {
  data: { gender: string; count: number; fill: string }[];
}

export function GenderDistributionChart({ data }: GenderDistributionProps) {
  const chartConfig = {
    male: {
      label: "Male",
      color: "hsl(var(--chart-1))",
    },
    female: {
      label: "Female",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig;

  // Calculate totals and percentages
  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <Card className="flex flex-col backdrop-blur-md bg-card/50 border-primary/10 shadow-sm overflow-hidden justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold tracking-tight">Gender Distribution</CardTitle>
        <CardDescription>Active Student Population breakdown</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 pb-6 flex flex-col justify-between">
        {/* Relative container to center our absolute stats text */}
        <div className="relative w-full h-[200px] flex items-center justify-center">
          <ChartContainer
            config={chartConfig}
            className="aspect-square h-full max-h-[190px]"
          >
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="gender"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={4}
                stroke="transparent"
                animationDuration={1500}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill} 
                    className="stroke-background stroke-2 transition-all duration-300 hover:opacity-90 focus:outline-none"
                  />
                ))}
              </Pie>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
            </PieChart>
          </ChartContainer>

          {/* Absolute centered text layer inside the Donut Chart */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-extrabold tracking-tight text-foreground transition-all duration-300">
              {total.toLocaleString()}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mt-0.5">
              Total Students
            </span>
          </div>
        </div>

        {/* Dynamic, premium Legend below the Donut Chart */}
        <div className="flex justify-center gap-6 pt-4 border-t border-primary/5">
          {data.map((entry, index) => {
            const percentage = total > 0 ? Math.round((entry.count / total) * 100) : 0;
            const isMale = entry.gender.toLowerCase() === "male";
            const labelText = isMale ? "Male" : "Female";
            
            return (
              <div key={index} className="flex items-center gap-2">
                <span 
                  className="size-3 rounded-full shadow-sm"
                  style={{ backgroundColor: entry.fill }}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground capitalize">
                    {labelText}
                  </span>
                  <span className="text-sm font-extrabold text-foreground">
                    {entry.count} <span className="text-xs font-medium text-muted-foreground">({percentage}%)</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
