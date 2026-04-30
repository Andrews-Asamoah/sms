"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  Clock,
  Coffee,
  MapPin,
  User,
  Plus,
  Settings,
  Printer,
  Loader2,
  Trash2,
  BookOpen,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PeriodTemplateManager } from "@/components/school/timetable/time-slot-manager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TimeSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  label: string | null;
}

type EntryType = "LESSON" | "BREAK" | "ACTIVITY";

interface TimetableEntry {
  id: string;
  type: EntryType;
  label: string | null;
  subject: { name: string; code: string } | null;
  teacher: { profile: { firstName: string; lastName: string } } | null;
  timeSlot: TimeSlot;
  classroom: { name: string } | null;
  departmentId?: string | null;
  classId?: string | null;
  subjectId?: string | null;
  teacherId?: string | null;
  timeSlotId: string;
  classroomId?: string | null;
  academicYearId: string;
}

export function TimetableClient() {
  const { schoolSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [view, setView] = useState<"class" | "teacher">("class");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [classes, setClasses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);

  // Dialog State
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [entryForm, setEntryForm] = useState({
    classId: "",
    departmentId: "",
    type: "LESSON" as EntryType,
    label: "",
    subjectId: "",
    timeSlotId: "",
    classroomId: "",
    academicYearId: "",
  });

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        slotsRes,
        classesRes,
        deptsRes,
        subjectsRes,
        teachersRes,
        roomsRes,
        yearsRes,
      ] = await Promise.all([
        fetch(`/api/schools/${schoolSlug}/timetable/slots`),
        fetch(`/api/schools/${schoolSlug}/classes`),
        fetch(`/api/schools/${schoolSlug}/departments`),
        fetch(`/api/schools/${schoolSlug}/subjects`),
        fetch(`/api/schools/${schoolSlug}/teachers`),
        fetch(`/api/schools/${schoolSlug}/classrooms`),
        fetch(`/api/schools/${schoolSlug}/academic-years`),
      ]);

      const [
        slotsData,
        classesData,
        deptsData,
        subsData,
        teachersData,
        roomsData,
        yearsData,
      ] = await Promise.all([
        slotsRes.json(),
        classesRes.json(),
        deptsRes.json(),
        subjectsRes.json(),
        teachersRes.json(),
        roomsRes.json().catch(() => []), // Graceful fallback
        yearsRes.json(),
      ]);

      setSlots(slotsData);
      setClasses(classesData);
      setDepartments(deptsData);
      setSubjects(subsData);
      setTeachers(teachersData);
      setClassrooms(roomsData);
      setAcademicYears(yearsData);

      // Set default academic year
      const activeYear = yearsData.find((y: any) => y.isCurrent);
      if (activeYear)
        setEntryForm((prev) => ({ ...prev, academicYearId: activeYear.id }));
    } catch (error) {
      toast.error("Failed to load timetable parameters");
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async (classId: string) => {
    if (!classId) return;
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/timetable?classId=${classId}`,
      );
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      toast.error("Failed to load schedule");
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolSlug]);

  useEffect(() => {
    if (selectedClass) {
      fetchEntries(selectedClass);
      // Derive the department for this class so we can fetch dept-specific slots
      const cls = classes.find((c) => c.id === selectedClass);
      const deptId = cls?.departmentId || "";
      setSelectedDepartmentId(deptId);
      // Refetch slots scoped to this department (+ school-wide)
      const slotsUrl = deptId
        ? `/api/schools/${schoolSlug}/timetable/slots?departmentId=${deptId}`
        : `/api/schools/${schoolSlug}/timetable/slots`;
      fetch(slotsUrl).then((r) => r.json()).then(setSlots).catch(() => {});
    }
  }, [selectedClass, classes]);

  // Realtime clock for the timetable
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const getEntryAt = (day: string, slotId: string) => {
    return entries.find(
      (e) => e.timeSlot.dayOfWeek === day && e.timeSlot.id === slotId,
    );
  };

  const isCurrentTimeSlot = (
    day: string,
    startTime: string,
    endTime: string,
  ) => {
    const currentDay = currentTime
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase();
    if (day !== currentDay) return false;

    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();

    const startTotalMins = startHour * 60 + startMin;
    const endTotalMins = endHour * 60 + endMin;
    const currentTotalMins = currentHour * 60 + currentMin;

    return (
      currentTotalMins >= startTotalMins && currentTotalMins < endTotalMins
    );
  };

  const getSlotProgressPercentage = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();

    const startTotalMins = startHour * 60 + startMin;
    const endTotalMins = endHour * 60 + endMin;
    const currentTotalMins = currentHour * 60 + currentMin;

    const totalDuration = endTotalMins - startTotalMins;
    const elapsed = currentTotalMins - startTotalMins;

    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  };

  const isPastTimeSlot = (day: string, endTime: string) => {
    const daysOfWeek = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];
    const currentDayIndex = currentTime.getDay();
    const slotDayIndex = daysOfWeek.indexOf(day);

    if (slotDayIndex < currentDayIndex) return true;
    if (slotDayIndex > currentDayIndex) return false;

    const [endHour, endMin] = endTime.split(":").map(Number);
    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();

    const endTotalMins = endHour * 60 + endMin;
    const currentTotalMins = currentHour * 60 + currentMin;

    return currentTotalMins >= endTotalMins;
  };

  const handleSaveEntry = async () => {
    if (!entryForm.timeSlotId || !entryForm.academicYearId) {
      return toast.error("Please fill in all required fields");
    }
    if (!entryForm.classId && !entryForm.departmentId) {
      return toast.error("Select either a Class or a Department");
    }
    if (entryForm.type === "LESSON" && !entryForm.subjectId) {
      return toast.error("Subject is required for a Lesson entry");
    }
    if (
      (entryForm.type === "BREAK" || entryForm.type === "ACTIVITY") &&
      !entryForm.label &&
      !entryForm.subjectId
    ) {
      return toast.error("A label or subject is required");
    }

    try {
      setSavingEntry(true);
      const url = editingEntry
        ? `/api/schools/${schoolSlug}/timetable/${editingEntry.id}`
        : `/api/schools/${schoolSlug}/timetable`;

      const res = await fetch(url, {
        method: editingEntry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryForm),
      });

      if (res.ok) {
        toast.success(editingEntry ? "Entry updated" : "Entry added");
        setIsEntryDialogOpen(false);
        setEditingEntry(null);
        if (selectedClass) fetchEntries(selectedClass);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save entry");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/timetable/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Entry removed");
        if (selectedClass) fetchEntries(selectedClass);
      }
    } catch (error) {
      toast.error("Failed to delete entry");
    }
  };

  const openAddDialog = (slotId?: string) => {
    setEditingEntry(null);
    setEntryForm({
      classId: selectedClass || "",
      departmentId: "",
      type: "LESSON",
      label: "",
      subjectId: "",
      timeSlotId: slotId || "",
      classroomId: "",
      academicYearId: academicYears.find((y) => y.isCurrent)?.id || "",
    });
    setIsEntryDialogOpen(true);
  };

  const openEditDialog = (entry: any) => {
    setEditingEntry(entry);
    setEntryForm({
      classId: entry.classId || "",
      departmentId: entry.departmentId || "",
      type: entry.type || "LESSON",
      label: entry.label || "",
      subjectId: entry.subjectId || "",
      timeSlotId: entry.timeSlotId,
      classroomId: entry.classroomId || "",
      academicYearId: entry.academicYearId,
    });
    setIsEntryDialogOpen(true);
  };

  // Group slots by time to create rows
  const uniqueTimeRanges = Array.from(
    new Set(slots.map((s) => `${s.startTime}-${s.endTime}`)),
  )
    .sort()
    .map((range) => {
      const [start, end] = range.split("-");
      return { start, end };
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Class Timetable</h1>
          <p className="text-muted-foreground">
            Manage and view weekly schedules.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={() => openAddDialog()}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Entry
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="w-64">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
            Select Class
          </label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select a class..." />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.level})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <Tabs value={view} onValueChange={(v: any) => setView(v)}>
          <TabsList>
            <TabsTrigger value="class">Class View</TabsTrigger>
            <TabsTrigger value="teacher">Teacher View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="grid">Weekly Grid</TabsTrigger>
          <TabsTrigger value="settings">Schedule Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          {!selectedClass ? (
            <Card className="border-dashed h-[400px] flex items-center justify-center text-center">
              <div className="space-y-4">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">No Class Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Please select a class from the dropdown above to view its
                    timetable.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-lg">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="p-4 text-left font-semibold text-sm w-32 border-r">
                      Time Slot
                    </th>
                    {days.map((day) => (
                      <th
                        key={day}
                        className="p-4 text-center font-semibold text-sm min-w-[150px]"
                      >
                        {day.charAt(0) + day.slice(1).toLowerCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uniqueTimeRanges.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-20 text-center text-muted-foreground italic"
                      >
                        No time slots defined. Go to "Schedule Settings" to add
                        them.
                      </td>
                    </tr>
                  ) : (
                    uniqueTimeRanges.map(({ start, end }) => (
                      <tr
                        key={`${start}-${end}`}
                        className="border-b last:border-0 h-32 hover:bg-muted/5 transition-colors"
                      >
                        <td className="p-4 border-r bg-muted/20">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="font-bold text-base">{start}</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                              — TO —
                            </span>
                            <span className="font-bold text-base">{end}</span>
                          </div>
                        </td>
                        {days.map((day) => {
                          const slot = slots.find(
                            (s) => s.dayOfWeek === day && s.startTime === start,
                          );
                          const entry = slot ? getEntryAt(day, slot.id) : null;

                          return (
                            <td
                              key={day}
                              className={`p-2 relative border-r last:border-r-0 align-top h-full ${
                                isPastTimeSlot(day, end) ? "bg-muted/30" : ""
                              }`}
                            >
                              {isCurrentTimeSlot(day, start, end) && (
                                <div
                                  className="absolute left-0 w-full z-20 flex items-center pointer-events-none"
                                  style={{
                                    top: `${getSlotProgressPercentage(start, end)}%`,
                                    transform: "translateY(-50%)",
                                  }}
                                >
                                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                  <div className="flex-1 h-[2px] bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                                  <div className="absolute right-1 -top-5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                    NOW
                                  </div>
                                </div>
                              )}
                              {entry ? (
                                <div
                                  className={`h-full w-full rounded-lg border p-3 flex flex-col justify-between group cursor-pointer transition-all ${
                                    entry.type === "BREAK"
                                      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700"
                                      : entry.type === "ACTIVITY"
                                        ? "bg-violet-50 dark:bg-violet-950/30 border-violet-300 dark:border-violet-700"
                                        : isPastTimeSlot(day, end)
                                          ? "bg-muted/50 border-muted-foreground/20 opacity-50 grayscale"
                                          : entry.departmentId
                                            ? "bg-secondary/10 border-secondary/20 hover:bg-secondary/15 shadow-sm"
                                            : "bg-primary/10 border-primary/20 hover:bg-primary/15 shadow-sm"
                                  } ${isCurrentTimeSlot(day, start, end) ? "ring-2 ring-primary/50" : ""}`}
                                >
                                  {entry.type === "BREAK" ? (
                                    // ── Break rendering ──────────────────
                                    <div className="flex flex-col items-center justify-center h-full gap-1 text-amber-700 dark:text-amber-300">
                                      <Coffee className="w-5 h-5" />
                                      <span className="font-bold text-sm">
                                        {entry.label || "Break"}
                                      </span>
                                    </div>
                                  ) : entry.type === "ACTIVITY" ? (
                                    // ── Activity rendering ───────────────
                                    <div className="flex flex-col h-full gap-1">
                                      <div className="flex items-center gap-1">
                                        <Activity className="w-3 h-3 text-violet-500" />
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] font-bold border-none uppercase tracking-tighter px-1 h-4 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                                        >
                                          {entry.label ||
                                            entry.subject?.code ||
                                            "Activity"}
                                        </Badge>
                                      </div>
                                      <p className="text-xs font-bold leading-tight">
                                        {entry.label || entry.subject?.name}
                                      </p>
                                      {entry.departmentId && (
                                        <p className="text-[10px] text-muted-foreground">
                                          Dept-wide
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <div className="flex gap-1">
                                            <Badge
                                              variant="secondary"
                                              className={`text-[10px] font-bold border-none uppercase tracking-tighter px-1 h-4 ${entry.departmentId ? "bg-secondary/20 text-secondary-foreground" : "bg-primary/20 text-primary"}`}
                                            >
                                              {entry.subject?.code}
                                            </Badge>
                                            {entry.departmentId && (
                                              <Badge
                                                variant="outline"
                                                className="text-[8px] h-4 px-1 uppercase opacity-70"
                                              >
                                                Dept
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={() =>
                                                openEditDialog(entry)
                                              }
                                            >
                                              <Settings className="w-3 h-3" />
                                            </Button>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-5 w-5 text-destructive"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>
                                                    Remove Timetable Entry?
                                                  </AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Are you sure you want to
                                                    remove this timetable entry?
                                                    This action cannot be
                                                    undone.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>
                                                    Cancel
                                                  </AlertDialogCancel>
                                                  <AlertDialogAction
                                                    onClick={() =>
                                                      handleDeleteEntry(
                                                        entry.id,
                                                      )
                                                    }
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                  >
                                                    Remove
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        </div>
                                        <p className="text-xs font-bold leading-tight">
                                          {entry.subject?.name}
                                        </p>
                                      </div>
                                      <div className="space-y-1 mt-2">
                                        {entry.teacher && (
                                          <div className="flex items-center text-[10px] text-muted-foreground font-medium">
                                            <User className="w-3 h-3 mr-1 text-primary/60" />
                                            {
                                              entry.teacher?.profile
                                                .firstName[0]
                                            }
                                            . {entry.teacher?.profile.lastName}
                                          </div>
                                        )}
                                        {entry.classroom && (
                                          <div className="flex items-center text-[10px] text-muted-foreground font-medium">
                                            <MapPin className="w-3 h-3 mr-1 text-primary/60" />
                                            {entry.classroom.name}
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              ) : slot ? (
                                <div
                                  onClick={() => openAddDialog(slot.id)}
                                  className="h-full w-full rounded-lg border border-dashed border-muted flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer bg-muted/10"
                                >
                                  <Plus className="w-4 h-4 text-muted-foreground/60" />
                                </div>
                              ) : (
                                <div className="h-full w-full bg-muted/5 opacity-50" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <PeriodTemplateManager
            schoolSlug={schoolSlug as string}
            departmentId={selectedDepartmentId || undefined}
            departments={departments}
            onRefresh={() => {
              fetchData();
              if (selectedClass) {
                const cls = classes.find((c) => c.id === selectedClass);
                const deptId = cls?.departmentId || "";
                const slotsUrl = deptId
                  ? `/api/schools/${schoolSlug}/timetable/slots?departmentId=${deptId}`
                  : `/api/schools/${schoolSlug}/timetable/slots`;
                fetch(slotsUrl).then((r) => r.json()).then(setSlots).catch(() => {});
              }
            }}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Timetable Entry" : "Add Timetable Entry"}
            </DialogTitle>
            <DialogDescription>
              Schedule a subject/period for a specific class or department.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Entry Type selector — controls what fields are shown */}
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Entry Type</label>
              <Tabs
                value={entryForm.type}
                onValueChange={(v) =>
                  setEntryForm({
                    ...entryForm,
                    type: v as EntryType,
                    label: "",
                    subjectId: "",
                  })
                }
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="LESSON" className="gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Lesson
                  </TabsTrigger>
                  <TabsTrigger value="BREAK" className="gap-1.5">
                    <Coffee className="w-3.5 h-3.5" /> Break
                  </TabsTrigger>
                  <TabsTrigger value="ACTIVITY" className="gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Activity
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {entryForm.type === "BREAK" && (
                <p className="text-xs text-muted-foreground">
                  Breaks have no subject or teacher. Scoped to the selected
                  department.
                </p>
              )}
              {entryForm.type === "ACTIVITY" && (
                <p className="text-xs text-muted-foreground">
                  Activities (P.E., Worship, Library) don't require a teacher
                  and apply to the whole department.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Apply To</label>
              <Tabs
                value={entryForm.classId ? "class" : "department"}
                onValueChange={(v) => {
                  if (v === "class")
                    setEntryForm({
                      ...entryForm,
                      departmentId: "",
                      classId: selectedClass,
                    });
                  else
                    setEntryForm({
                      ...entryForm,
                      classId: "",
                      departmentId: departments[0]?.id || "",
                    });
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="class">Class</TabsTrigger>
                  <TabsTrigger value="department">Department</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {entryForm.classId ? "Target Class" : "Target Department"}
              </label>
              {entryForm.classId ? (
                <Select
                  value={entryForm.classId}
                  onValueChange={(v) =>
                    setEntryForm({ ...entryForm, classId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={entryForm.departmentId}
                  onValueChange={(v) =>
                    setEntryForm({ ...entryForm, departmentId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Subject — hidden for BREAK, visible for LESSON & ACTIVITY */}
            {entryForm.type !== "BREAK" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {entryForm.type === "ACTIVITY"
                    ? "Subject (optional)"
                    : "Subject"}
                </label>
                <Select
                  value={entryForm.subjectId}
                  onValueChange={(v) =>
                    setEntryForm({ ...entryForm, subjectId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Label — required for BREAK, optional for ACTIVITY */}
            {(entryForm.type === "BREAK" || entryForm.type === "ACTIVITY") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {entryForm.type === "BREAK"
                    ? "Break Name"
                    : "Activity Label (optional)"}
                </label>
                <Input
                  placeholder={
                    entryForm.type === "BREAK"
                      ? "e.g. Lunch Break"
                      : "e.g. Worship, P.E."
                  }
                  value={entryForm.label}
                  onChange={(e) =>
                    setEntryForm({ ...entryForm, label: e.target.value })
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Time Slot</label>
              <Select
                value={entryForm.timeSlotId}
                onValueChange={(v) =>
                  setEntryForm({ ...entryForm, timeSlotId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select slot" />
                </SelectTrigger>
                <SelectContent>
                  {slots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.dayOfWeek}: {s.startTime}-{s.endTime}{" "}
                      {s.label ? `(${s.label})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Classroom (Optional)
              </label>
              <Select
                value={entryForm.classroomId}
                onValueChange={(v) =>
                  setEntryForm({ ...entryForm, classroomId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Library, Lab, etc." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {classrooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEntryDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEntry} disabled={savingEntry}>
              {savingEntry && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingEntry ? "Update Entry" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
