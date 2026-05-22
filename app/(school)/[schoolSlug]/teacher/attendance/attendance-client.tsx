// app/(school)/[schoolSlug]/teacher/attendance/attendance-client.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  Loader2,
  Save,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  HeartPulse,
  FileCheck,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "SICK" | "PERMISSION";

interface AttendanceStudent {
  studentId: string;
  name: string;
  status: AttendanceStatus;
  remarks: string;
}

interface ClassData {
  id: string;
  name: string;
  academicYear: {
    name: string;
  };
}

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; icon: React.ElementType; activeClass: string; ringClass: string }
> = {
  PRESENT: {
    label: "Present",
    icon: CheckCircle2,
    activeClass: "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600",
    ringClass: "ring-2 ring-emerald-500/30",
  },
  ABSENT: {
    label: "Absent",
    icon: XCircle,
    activeClass: "bg-red-500 text-white border-red-500 hover:bg-red-600",
    ringClass: "ring-2 ring-red-500/30",
  },
  LATE: {
    label: "Late",
    icon: Clock,
    activeClass: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600",
    ringClass: "ring-2 ring-amber-500/30",
  },
  EXCUSED: {
    label: "Excused",
    icon: ShieldCheck,
    activeClass: "bg-blue-500 text-white border-blue-500 hover:bg-blue-600",
    ringClass: "ring-2 ring-blue-500/30",
  },
  SICK: {
    label: "Sick",
    icon: HeartPulse,
    activeClass: "bg-orange-500 text-white border-orange-500 hover:bg-orangeald-600",
    ringClass: "ring-2 ring-orange-500/30",
  },
  PERMISSION: {
    label: "Permission",
    icon: FileCheck,
    activeClass: "bg-violet-500 text-white border-violet-500 hover:bg-violet-600",
    ringClass: "ring-2 ring-violet-500/30",
  },
};

const STATUS_BADGE: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  ABSENT: "bg-red-500/10 text-red-600 border-red-500/20",
  LATE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  EXCUSED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  SICK: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  PERMISSION: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

export function AttendanceClient({
  initialClasses,
  schoolSlug,
  editableClassIds,
  isAdmin,
}: {
  initialClasses: ClassData[];
  schoolSlug: string;
  editableClassIds: string[];
  isAdmin: boolean;
}) {
  const [selectedClass, setSelectedClass] = useState<string>(
    initialClasses[0]?.id || "",
  );
  const [date, setDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [markedDates, setMarkedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calOpen, setCalOpen] = useState(false);

  const canEdit = isAdmin || editableClassIds.includes(selectedClass);

  const fetchAttendance = async () => {
    if (!selectedClass || !date) return;
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(
        `/api/schools/${schoolSlug}/attendance?classId=${selectedClass}&date=${dateStr}`,
      );
      const data = await res.json();
      if (data.students) setStudents(data.students);
    } catch {
      toast.error("Failed to fetch attendance data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMarkedDates = async () => {
    if (!selectedClass) return;
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/attendance/marked-dates?classId=${selectedClass}`,
      );
      const data = await res.json();
      if (data.dates) setMarkedDates(data.dates);
    } catch {
      console.error("Failed to fetch marked dates");
    }
  };

  useEffect(() => { fetchAttendance(); }, [selectedClass, date]);
  useEffect(() => { fetchMarkedDates(); }, [selectedClass]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s)),
    );
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, remarks } : s)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/attendance/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClass,
          date: format(date, "yyyy-MM-dd"),
          attendances: students,
        }),
      });

      if (res.ok) {
        toast.success("Attendance saved successfully");
        fetchMarkedDates();
      } else {
        const err = await res.json();
        toast.error(err?.error || "Failed to save attendance");
      }
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  // Derived stats
  const stats = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, SICK: 0, PERMISSION: 0,
    };
    students.forEach((s) => { counts[s.status]++; });
    return counts;
  }, [students]);

  const presentCount = stats.PRESENT;
  const attendanceRate =
    students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  const selectedClassData = initialClasses.find((c) => c.id === selectedClass);
  const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      {/* Top Controls Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Class Selector */}
        <Card className="border border-border/40 bg-card/50 backdrop-blur-md shadow-sm xl:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Class
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full rounded-xl border-border/50 bg-background/50 focus:ring-primary/20">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {initialClasses.map((cl) => (
                  <SelectItem key={cl.id} value={cl.id}>
                    <span className="font-medium">{cl.name}</span>
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({cl.academicYear.name})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Date Picker */}
        <Card className="border border-border/40 bg-card/50 backdrop-blur-md shadow-sm xl:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              Date
              {isToday && (
                <Badge className="ml-1 text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 rounded-full">
                  Today
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-between text-left font-normal rounded-xl border-border/50 bg-background/50",
                    !date && "text-muted-foreground",
                  )}
                >
                  <span>{date ? format(date, "MMM d, yyyy") : "Pick a date"}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { if (d) { setDate(d); setCalOpen(false); } }}
                  initialFocus
                  disabled={(d) => d > new Date()}
                  modifiers={{
                    marked: (d) => markedDates.includes(format(d, "yyyy-MM-dd")),
                  }}
                  modifiersStyles={{
                    marked: {
                      fontWeight: "bold",
                      backgroundColor: "rgba(34, 197, 94, 0.15)",
                      color: "rgb(21, 128, 61)",
                      borderRadius: "6px",
                    },
                  }}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="border border-border/40 bg-card/50 backdrop-blur-md shadow-sm xl:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold tracking-tight">
                {presentCount}
                <span className="text-muted-foreground font-normal text-base">
                  /{students.length}
                </span>
              </span>
              <span className={cn(
                "text-sm font-semibold mb-0.5",
                attendanceRate >= 80 ? "text-emerald-500" :
                attendanceRate >= 60 ? "text-amber-500" : "text-red-500"
              )}>
                {attendanceRate}%
              </span>
            </div>
            <div className="mt-2 w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  attendanceRate >= 80 ? "bg-emerald-500" :
                  attendanceRate >= 60 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Present today</p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex flex-col justify-end xl:col-span-1">
          <Button
            className={cn(
              "w-full h-[42px] rounded-xl font-semibold shadow-md transition-all duration-300",
              canEdit
                ? "bg-gradient-to-r from-primary to-primary/80 hover:shadow-primary/20 hover:shadow-lg"
                : "opacity-60 cursor-not-allowed"
            )}
            onClick={handleSave}
            disabled={saving || loading || students.length === 0 || !canEdit}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {canEdit ? "Save Attendance" : "Read Only"}
          </Button>

          {!canEdit && (
            <p className="text-[10px] text-muted-foreground text-center mt-1.5 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              You are not the class teacher
            </p>
          )}
        </div>
      </div>

      {/* Status Summary Pills */}
      {students.length > 0 && !loading && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            const count = stats[status];
            if (count === 0) return null;
            return (
              <div
                key={status}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                  STATUS_BADGE[status],
                )}
              >
                <Icon className="h-3 w-3" />
                {cfg.label}: {count}
              </div>
            );
          })}
        </div>
      )}

      {/* Student List */}
      <Card className="border border-border/40 bg-card/50 backdrop-blur-md shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/30 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Student Attendance
                {selectedClassData && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    — {selectedClassData.name}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-0.5">
                {format(date, "EEEE, MMMM d, yyyy")}
              </CardDescription>
            </div>
            {students.length > 0 && !loading && (
              <Badge variant="outline" className="text-xs rounded-full px-3">
                {students.length} students
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading students...</p>
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center px-6">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No students found</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                This class has no active students enrolled.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Sticky header row */}
              <div className="min-w-[640px]">
                <div className="grid grid-cols-[2fr_3fr_2fr] items-center px-6 py-2.5 bg-muted/30 border-b border-border/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0">
                  <span>Student</span>
                  <span>Status</span>
                  <span>Remarks</span>
                </div>

                <div className="divide-y divide-border/20">
                  {students.map((student, index) => {
                    const cfg = STATUS_CONFIG[student.status];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={student.studentId}
                        className={cn(
                          "grid grid-cols-[2fr_3fr_2fr] items-center px-6 py-3.5 transition-colors duration-150 min-w-[640px]",
                          "hover:bg-muted/20",
                          index % 2 === 0 ? "bg-transparent" : "bg-muted/5",
                        )}
                      >
                        {/* Student Name */}
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                            STATUS_BADGE[student.status],
                          )}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm truncate">{student.name}</span>
                        </div>

                        {/* Status Buttons */}
                        <div className="flex flex-wrap gap-1.5">
                          {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map((status) => {
                            const sCfg = STATUS_CONFIG[status];
                            const SIcon = sCfg.icon;
                            const isActive = student.status === status;
                            return (
                              <button
                                key={status}
                                disabled={!canEdit}
                                onClick={() => canEdit && updateStatus(student.studentId, status)}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all duration-150",
                                  isActive
                                    ? sCfg.activeClass
                                    : "bg-background/60 text-muted-foreground border-border/50 hover:border-border",
                                  isActive && sCfg.ringClass,
                                  !canEdit && "opacity-50 cursor-not-allowed",
                                )}
                              >
                                <SIcon className="h-2.5 w-2.5" />
                                {sCfg.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Remarks Input */}
                        <div className="pl-2">
                          <input
                            type="text"
                            className={cn(
                              "w-full bg-transparent text-xs border-b border-transparent focus:border-border/60 outline-none transition-colors duration-150 py-0.5",
                              "placeholder:text-muted-foreground/40",
                              canEdit ? "focus:bg-muted/20 rounded px-1" : "opacity-50 cursor-not-allowed",
                            )}
                            placeholder={canEdit ? "Add remark..." : "—"}
                            value={student.remarks || ""}
                            disabled={!canEdit}
                            onChange={(e) =>
                              canEdit && updateRemarks(student.studentId, e.target.value)
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer with save */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-border/20 bg-muted/10">
                  <p className="text-xs text-muted-foreground">
                    {presentCount} of {students.length} students marked present
                  </p>
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={handleSave}
                    disabled={saving || !canEdit || students.length === 0}
                  >
                    {saving ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
