// app/(school)/[schoolSlug]/teacher/attendance/attendance-client.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, Loader2, Save } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AttendanceStudent {
  studentId: string;
  name: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "SICK" | "PERMISSION";
  remarks: string;
}

interface ClassData {
  id: string;
  name: string;
  academicYear: {
    name: string;
  };
}

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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      if (data.students) {
        setStudents(data.students);
      }
    } catch (error) {
      toast.error("Failed to fetch attendance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedClass, date]);

  const updateStatus = (
    studentId: string,
    status: AttendanceStudent["status"],
  ) => {
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
        body: JSON.stringify({
          classId: selectedClass,
          date: format(date, "yyyy-MM-dd"),
          attendances: students,
        }),
      });

      if (res.ok) {
        toast.success("Attendance saved successfully");
      } else {
        toast.error("Failed to save attendance");
      }
    } catch (error) {
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = students.filter((s) => s.status === "PRESENT").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle>Class Selection</CardTitle>
            <CardDescription>
              Select the class to mark attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {initialClasses.map((cl) => (
                  <SelectItem key={cl.id} value={cl.id}>
                    {cl.name} ({cl.academicYear.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle>Date Selection</CardTitle>
            <CardDescription>Mark attendance for specific day</CardDescription>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  disabled={(d) => d > new Date()}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle>Stats</CardTitle>
            <CardDescription>Quick overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {presentCount} / {students.length}
            </div>
            <p className="text-xs text-muted-foreground">Students Present</p>
          </CardContent>
        </Card>

        <div className="flex items-end pb-2">
          <Button
            className="w-full h-12 text-lg"
            onClick={handleSave}
            disabled={saving || loading || students.length === 0 || !canEdit}
          >
            {saving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            {canEdit ? "Save Attendance" : "Read Only"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>
            Mark students as present, absent, or late
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[400px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              No students found in this class.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-[300px]">Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(["PRESENT", "ABSENT", "LATE", "SICK"] as const).map(
                            (status) => (
                              <Button
                                key={status}
                                variant={
                                  student.status === status
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                disabled={!canEdit}
                                className={cn(
                                  "h-8 px-2 text-[10px]",
                                  student.status === status &&
                                    status === "PRESENT" &&
                                    "bg-green-600 hover:bg-green-700",
                                  student.status === status &&
                                    status === "ABSENT" &&
                                    "bg-destructive hover:bg-destructive/90",
                                  student.status === status &&
                                    status === "LATE" &&
                                    "bg-yellow-600 hover:bg-yellow-700",
                                )}
                                onClick={() =>
                                  canEdit &&
                                  updateStatus(student.studentId, status)
                                }
                              >
                                {status === "PRESENT" && (
                                  <Check className="mr-1 h-3 w-3" />
                                )}
                                {status}
                              </Button>
                            ),
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <input
                          type="text"
                          className="w-full bg-transparent text-sm border-none focus:ring-0 placeholder:text-muted-foreground/50 disabled:opacity-50"
                          placeholder={canEdit ? "Add remark..." : "No remarks"}
                          value={student.remarks || ""}
                          disabled={!canEdit}
                          onChange={(e) =>
                            canEdit &&
                            updateRemarks(student.studentId, e.target.value)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
