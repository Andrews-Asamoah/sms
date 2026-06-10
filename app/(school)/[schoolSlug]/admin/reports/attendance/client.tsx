"use client";

import { useState, useCallback, useTransition } from "react";
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Stethoscope,
  ClipboardCheck,
  SlidersHorizontal,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClassOption {
  id: string;
  name: string;
}

interface StudentRow {
  studentId: string;
  name: string;
  className: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  sick: number;
  permission: number;
  total: number;
  attendanceRate: number;
}

interface Summary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  sick: number;
  permission: number;
}

interface AttendanceReportClientProps {
  schoolSlug: string;
  classes: ClassOption[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rateColor(rate: number) {
  if (rate >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 75) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function rateBarColor(rate: number) {
  if (rate >= 90) return "bg-emerald-500";
  if (rate >= 75) return "bg-amber-400";
  return "bg-red-500";
}

function RateBadge({ rate }: { rate: number }) {
  const color =
    rate >= 90
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
      : rate >= 75
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
      : "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${color}`}
    >
      {rate >= 90 ? (
        <TrendingUp className="h-3 w-3" />
      ) : rate < 75 ? (
        <AlertTriangle className="h-3 w-3" />
      ) : null}
      {rate}%
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttendanceReportClient({
  schoolSlug,
  classes,
}: AttendanceReportClientProps) {
  // Filters
  const [classId, setClassId]     = useState<string>("all");
  const [dateFrom, setDateFrom]   = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // start of current month
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo]       = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Results
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [rows, setRows]           = useState<StudentRow[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchReport = useCallback(() => {
    startTransition(async () => {
      setError(null);
      try {
        const params = new URLSearchParams();
        if (classId !== "all")      params.set("classId", classId);
        if (dateFrom)               params.set("dateFrom", dateFrom);
        if (dateTo)                 params.set("dateTo", dateTo);
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await fetch(
          `/api/schools/${schoolSlug}/attendance/report?${params.toString()}`
        );
        if (!res.ok) throw new Error("Failed to load attendance data");
        const data = await res.json();
        setSummary(data.summary);
        setRows(data.rows);
        setHasLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    });
  }, [schoolSlug, classId, dateFrom, dateTo, statusFilter]);

  // CSV export
  const exportCSV = useCallback(() => {
    if (!rows.length) return;
    const headers = [
      "Student Name", "Class", "Total Days", "Present", "Absent",
      "Late", "Excused", "Sick", "Permission", "Attendance Rate (%)",
    ];
    const csvRows = rows.map((r) => [
      r.name, r.className, r.total, r.present, r.absent,
      r.late, r.excused, r.sick, r.permission, r.attendanceRate,
    ]);
    const csv = [headers, ...csvRows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, dateFrom, dateTo]);

  const attendanceRate = summary && summary.total > 0
    ? Math.round(
        ((summary.present + summary.late + summary.excused + summary.sick + summary.permission)
          / summary.total) * 1000
      ) / 10
    : null;

  return (
    <div className="space-y-6">
      {/* ── Filters Card ─────────────────────────────────────────────────── */}
      <Card
        className="rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md"
        id="attendance-filters-card"
      >
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold">Filters</CardTitle>
          </div>
          <CardDescription>
            Narrow the report by class, date range, or attendance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {/* Class */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-class" className="text-xs font-semibold">
                Class
              </Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger id="filter-class" className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-date-from" className="text-xs font-semibold">
                From
              </Label>
              <Input
                id="filter-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-lg text-sm"
              />
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-date-to" className="text-xs font-semibold">
                To
              </Label>
              <Input
                id="filter-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-lg text-sm"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-status" className="text-xs font-semibold">
                Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="filter-status" className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ABSENT">Absent Only</SelectItem>
                  <SelectItem value="PRESENT">Present Only</SelectItem>
                  <SelectItem value="LATE">Late Only</SelectItem>
                  <SelectItem value="EXCUSED">Excused Only</SelectItem>
                  <SelectItem value="SICK">Sick Only</SelectItem>
                  <SelectItem value="PERMISSION">Permission Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                id="generate-report-btn"
                onClick={fetchReport}
                disabled={isPending}
                className="w-full h-9 rounded-lg font-semibold text-sm"
              >
                {isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                )}
                {isPending ? "Loading…" : "Generate Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Empty prompt ─────────────────────────────────────────────────── */}
      {!hasLoaded && !isPending && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-lg">No Report Generated Yet</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            Choose your filters above and click <strong>Generate Report</strong> to view attendance data.
          </p>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {hasLoaded && summary && (
        <>
          {/* Summary KPI cards */}
          <div
            className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7"
            id="attendance-summary-cards"
          >
            {[
              { label: "Overall Rate", value: attendanceRate !== null ? `${attendanceRate}%` : "—", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
              { label: "Present",    value: summary.present,    icon: CheckCircle2,   color: "text-emerald-600", bg: "bg-emerald-500/10" },
              { label: "Absent",     value: summary.absent,     icon: XCircle,        color: "text-red-600",     bg: "bg-red-500/10" },
              { label: "Late",       value: summary.late,       icon: Clock,          color: "text-amber-600",   bg: "bg-amber-500/10" },
              { label: "Excused",    value: summary.excused,    icon: Shield,         color: "text-blue-600",    bg: "bg-blue-500/10" },
              { label: "Sick",       value: summary.sick,       icon: Stethoscope,    color: "text-purple-600",  bg: "bg-purple-500/10" },
              { label: "Permission", value: summary.permission, icon: ClipboardCheck, color: "text-indigo-600",  bg: "bg-indigo-500/10" },
            ].map((kpi) => (
              <Card
                key={kpi.label}
                className="rounded-xl border-primary/5 bg-card/50 backdrop-blur-md hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <p className="text-[11px] font-semibold text-muted-foreground truncate">
                      {kpi.label}
                    </p>
                    <div className={`rounded-lg p-1.5 ${kpi.bg} ${kpi.color} shrink-0`}>
                      <kpi.icon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <p className="text-2xl font-black tabular-nums">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table header + export */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold">Student Breakdown</h2>
              <p className="text-xs text-muted-foreground">
                {rows.length} student{rows.length !== 1 ? "s" : ""} • sorted by lowest attendance first
              </p>
            </div>
            {rows.length > 0 && (
              <Button
                id="export-csv-btn"
                variant="outline"
                size="sm"
                onClick={exportCSV}
                className="rounded-xl text-xs h-8 border-border/60"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export CSV
              </Button>
            )}
          </div>

          {/* Table */}
          {rows.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-2">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No attendance records found for the selected filters.
              </CardContent>
            </Card>
          ) : (
            <Card
              className="rounded-2xl border-primary/5 bg-card/50 backdrop-blur-md overflow-hidden"
              id="attendance-student-table-card"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]" id="attendance-student-table">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      {["#", "Student", "Class", "Total", "Present", "Absent", "Late", "Excused", "Sick", "Permission", "Rate"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {rows.map((row, idx) => (
                      <tr
                        key={row.studentId}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-3 sm:px-4 py-3 text-xs text-muted-foreground tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="px-3 sm:px-4 py-3 font-semibold text-sm whitespace-nowrap">
                          {row.name}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {row.className}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm font-mono tabular-nums font-bold">
                          {row.total}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm font-mono tabular-nums text-emerald-600">
                          {row.present}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm font-mono tabular-nums text-red-600">
                          {row.absent}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm font-mono tabular-nums text-amber-600">
                          {row.late}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm font-mono tabular-nums text-blue-600">
                          {row.excused}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm font-mono tabular-nums text-purple-600">
                          {row.sick}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm font-mono tabular-nums text-indigo-600">
                          {row.permission}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                              <div
                                className={`h-full rounded-full ${rateBarColor(row.attendanceRate)}`}
                                style={{ width: `${row.attendanceRate}%` }}
                              />
                            </div>
                            <RateBadge rate={row.attendanceRate} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
