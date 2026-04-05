"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth, startOfDay } from "date-fns";
import { Loader2, CheckCircle2, XCircle, Clock, CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getStudentAttendance } from "@/app/actions/attendance/get-student-attendance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Make sure these match the server action returns
interface AttendanceRecord {
  id: string;
  date: Date;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "SICK" | "PERMISSION";
  remarks: string | null;
}

interface Stats {
  PRESENT: number;
  ABSENT: number;
  LATE: number;
  EXCUSED: number;
  SICK: number;
  PERMISSION: number;
}

interface StudentAttendanceViewProps {
  schoolSlug: string;
  studentId: string;
  studentName: string;
  initialDate?: Date;
}

export function StudentAttendanceView({
  schoolSlug,
  studentId,
  studentName,
  initialDate = new Date(),
}: StudentAttendanceViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(initialDate));
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Derive sets for calendar modifiers
  const presentDates = attendances
    .filter((a) => a.status === "PRESENT")
    .map((a) => format(startOfDay(new Date(a.date)), "yyyy-MM-dd"));
  const absentDates = attendances
    .filter((a) => a.status === "ABSENT")
    .map((a) => format(startOfDay(new Date(a.date)), "yyyy-MM-dd"));
  const lateDates = attendances
    .filter((a) => a.status === "LATE")
    .map((a) => format(startOfDay(new Date(a.date)), "yyyy-MM-dd"));
  const excusedDates = attendances
    .filter((a) => ["EXCUSED", "SICK", "PERMISSION"].includes(a.status))
    .map((a) => format(startOfDay(new Date(a.date)), "yyyy-MM-dd"));

  const fetchMonthData = useCallback(async (month: Date) => {
    setLoading(true);
    try {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const result = await getStudentAttendance({
        schoolSlug,
        studentId,
        startDateStr: start.toISOString(),
        endDateStr: end.toISOString(),
      });

      setAttendances(result.attendances as any);
      setStats(result.stats);
    } catch (error) {
      toast.error("Failed to load attendance records.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [schoolSlug, studentId]);

  useEffect(() => {
    fetchMonthData(currentMonth);
  }, [currentMonth, fetchMonthData]);

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  const statusConfig = {
    PRESENT: { label: "Present", color: "text-green-600 bg-green-500/10 border-green-200" },
    ABSENT: { label: "Absent", color: "text-red-600 bg-red-500/10 border-red-200" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance Record</h2>
          <p className="text-muted-foreground">
            Viewing records for {studentName}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Present</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{stats?.PRESENT || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Days attended</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">{stats?.ABSENT || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Days missed</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-3">
        {/* Calendar Section */}
        <Card className="md:col-span-3 lg:col-span-1 shadow-sm border-primary/10">
          <CardHeader className="bg-primary/[0.02]">
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>Visual breakdown of {format(currentMonth, "MMMM yyyy")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col items-center justify-center">
            <div className={cn("transition-opacity", loading && "opacity-50")}>
              <Calendar
                mode="single"
                month={currentMonth}
                onMonthChange={handleMonthChange}
                modifiers={{
                  present: (date) => presentDates.includes(format(date, "yyyy-MM-dd")),
                  absent: (date) => absentDates.includes(format(date, "yyyy-MM-dd")),
                }}
                modifiersStyles={{
                  present: {
                    fontWeight: "bold",
                    backgroundColor: "rgba(34, 197, 94, 0.2)",
                    color: "rgb(21, 128, 61)",
                  },
                  absent: {
                    fontWeight: "bold",
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    color: "rgb(185, 28, 28)",
                  },
                }}
                className="rounded-md border p-3"
              />
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/50"></div>
                <span>Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/50"></div>
                <span>Absent</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History Table Section */}
        <Card className="md:col-span-4 lg:col-span-2 shadow-sm border-primary/10">
          <CardHeader className="bg-primary/[0.02]">
            <CardTitle>Detailed History</CardTitle>
            <CardDescription>Chronological log for the month</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex h-[350px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : attendances.length === 0 ? (
              <div className="flex h-[350px] flex-col items-center justify-center text-muted-foreground border-dashed border-2 rounded-lg bg-muted/20">
                <CalendarDays className="h-10 w-10 mb-2 opacity-20" />
                <p>No attendance records found for this month.</p>
              </div>
            ) : (
              <div className="rounded-md border h-[380px] overflow-auto relative">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead className="w-[150px]">Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendances.map((att) => {
                      const dateObj = new Date(att.date);
                      const config = statusConfig[att.status as keyof typeof statusConfig];
                      
                      return (
                        <TableRow key={att.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {format(dateObj, "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(dateObj, "EEEE")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("font-semibold shadow-sm", config?.color)}>
                              {config?.label || att.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {att.remarks ? (
                               <span className="text-muted-foreground">{att.remarks}</span>
                            ) : (
                               <span className="text-muted-foreground/40 italic">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
