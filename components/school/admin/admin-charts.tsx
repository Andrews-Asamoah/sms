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
    <Card className="backdrop-blur-md bg-card/50 border-primary/10 shadow-sm overflow-hidden">
      <CardHeader>
        <CardTitle>Enrollment Growth</CardTitle>
        <CardDescription>
          Visualizing student population over the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillStudents" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-students)"
                  stopOpacity={0.3}
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
              className="stroke-muted/50"
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="students"
              stroke="var(--color-students)"
              fill="url(#fillStudents)"
              strokeWidth={3}
              animationDuration={1500}
              activeDot={{
                r: 6,
                style: {
                  fill: "var(--color-students)",
                  stroke: "var(--background)",
                  strokeWidth: 2,
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

  return (
    <Card className="backdrop-blur-md bg-card/50 border-primary/10 shadow-sm overflow-hidden">
      <CardHeader>
        <CardTitle>Financial Status</CardTitle>
        <CardDescription>
          Revenue vs Outstanding Balance ({currency})
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <BarChart data={data} layout="vertical">
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="value"
              radius={[0, 6, 6, 0]}
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                  className="transition-all hover:opacity-80"
                />
              ))}
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

  return (
    <Card className="flex flex-col backdrop-blur-md bg-card/50 border-primary/10 shadow-sm overflow-hidden">
      <CardHeader className="items-center pb-0">
        <CardTitle>Gender Distribution</CardTitle>
        <CardDescription>Active Student Population</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 px-2 sm:px-6">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-[16/9] w-full"
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 10, right: 40, top: 20, bottom: 20 }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="gender"
              type="category"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
              className="font-medium"
            />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="count"
              radius={[0, 6, 6, 0]}
              animationDuration={1500}
              barSize={32}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill} 
                  className="transition-all hover:opacity-80"
                />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                offset={10}
                className="fill-foreground font-bold"
                fontSize={14}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
