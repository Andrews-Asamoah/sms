"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { saveAttendanceBatch } from "./actions";

type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED"
  | "SICK"
  | "PERMISSION";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  image: string | null;
}

interface AttendanceClientProps {
  schoolSlug: string;
  classSlug: string;
  students: Student[];
  initialAttendance: Record<
    string,
    { status: AttendanceStatus; remarks?: string }
  >;
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-100 text-green-700 hover:bg-green-100",
  ABSENT: "bg-red-100 text-red-700 hover:bg-red-100",
  LATE: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  EXCUSED: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  SICK: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  PERMISSION: "bg-orange-100 text-orange-700 hover:bg-orange-100",
};

export function AttendanceClient({
  schoolSlug,
  classSlug,
  students,
  initialAttendance,
}: AttendanceClientProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >(
    Object.fromEntries(
      students.map((s) => [s.id, initialAttendance[s.id]?.status || "PRESENT"]),
    ),
  );
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const newAttendance = { ...attendance };
    students.forEach((s) => {
      newAttendance[s.id] = status;
    });
    setAttendance(newAttendance);
  };

  const handleSave = () => {
    startTransition(async () => {
      const entries = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status: status as any, // Cast to match prisma enum
      }));

      const result = await saveAttendanceBatch(
        schoolSlug,
        classSlug,
        date,
        entries,
      );

      if (result.success) {
        toast.success("Attendance Saved", {
          description: `Attendance for ${format(date, "PPP")} has been recorded.`,
        });
      } else {
        toast.error("Error", {
          description: result.error || "Failed to save attendance.",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Badge variant="outline" className="h-9 px-3">
            {students.length} Students
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground mr-2 hidden lg:block">
            Mark All:
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAll("PRESENT")}
            className="text-green-600"
          >
            Present
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAll("ABSENT")}
            className="text-red-600"
          >
            Absent
          </Button>
          <Button className="ml-4" onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[300px]">Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[150px] text-right">
                Quick Select
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {student.firstName.charAt(0)}
                        {student.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {student.admissionNumber || "N/A"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={attendance[student.id]}
                    onValueChange={(val) =>
                      handleStatusChange(student.id, val as AttendanceStatus)
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        "w-[140px] h-8 text-xs font-medium",
                        STATUS_COLORS[attendance[student.id]],
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRESENT">Present</SelectItem>
                      <SelectItem value="ABSENT">Absent</SelectItem>
                      <SelectItem value="LATE">Late</SelectItem>
                      <SelectItem value="EXCUSED">Excused</SelectItem>
                      <SelectItem value="SICK">Sick</SelectItem>
                      <SelectItem value="PERMISSION">
                        With Permission
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant={
                        attendance[student.id] === "PRESENT"
                          ? "default"
                          : "outline"
                      }
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => handleStatusChange(student.id, "PRESENT")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={
                        attendance[student.id] === "ABSENT"
                          ? "destructive"
                          : "outline"
                      }
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => handleStatusChange(student.id, "ABSENT")}
                    >
                      <AlertCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
