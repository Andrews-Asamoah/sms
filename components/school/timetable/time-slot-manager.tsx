"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Clock,
  Loader2,
  Zap,
  GripVertical,
  Pencil,
  Check,
  X,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MultiSelect } from "@/components/ui/multi-select";

interface PeriodTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;

/** Sentinel value used when the user picks "All Departments (school-wide)" */
const SCOPE_ALL = "__ALL__";

export function PeriodTemplateManager({
  schoolSlug,
  departmentId: defaultDeptId,
  departments = [],
  onRefresh,
}: {
  schoolSlug: string;
  departmentId?: string;
  departments?: Department[];
  onRefresh?: () => void;
}) {
  const [periods, setPeriods] = useState<PeriodTemplate[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /**
   * `scopes` holds the currently-selected departments (multi-select).
   * Each entry is either a real department id or the SCOPE_ALL sentinel.
   * We treat SCOPE_ALL as "no departmentId filter" (school-wide templates).
   */
  const [scopes, setScopes] = useState<string[]>(
    defaultDeptId ? [defaultDeptId] : [SCOPE_ALL],
  );

  // Form state
  const [name, setName] = useState("");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("08:45");

  // Generate week options
  const [selectedDays, setSelectedDays] = useState<string[]>([...WEEKDAYS]);

  // ── Build the options list for the MultiSelect ─────────────────────────
  const scopeOptions = [
    { value: SCOPE_ALL, label: "🏫 All Departments (School-wide)" },
    ...departments.map((d) => ({ value: d.id, label: `🏷️ ${d.name}` })),
  ];

  /**
   * Derive the real department ids to use for API calls.
   * SCOPE_ALL maps to null (school-wide); real ids are passed as-is.
   */
  const effectiveDeptIds = scopes.includes(SCOPE_ALL)
    ? [] // empty = school-wide; API interprets no departmentId as school-wide
    : scopes;

  const fetchPeriods = async () => {
    try {
      setLoadingPeriods(true);

      // Build query string — pass each dept as a separate param so the API
      // can return templates for all selected depts + school-wide ones.
      let url = `/api/schools/${schoolSlug}/timetable/periods`;
      if (effectiveDeptIds.length > 0) {
        const qs = effectiveDeptIds.map((id) => `departmentId=${encodeURIComponent(id)}`).join("&");
        url += `?${qs}`;
      }

      const res = await fetch(url);
      if (res.ok) setPeriods(await res.json());
    } catch {
      toast.error("Failed to fetch periods");
    } finally {
      setLoadingPeriods(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopes]);

  useEffect(() => {
    if (defaultDeptId) setScopes([defaultDeptId]);
  }, [defaultDeptId]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setStart("08:00");
    setEnd("08:45");
  };

  const handleSave = async () => {
    if (!name.trim() || !start || !end) {
      return toast.error("Name, start time, and end time are required");
    }
    if (start >= end) {
      return toast.error("End time must be after start time");
    }

    setSaving(true);
    try {
      if (editingId) {
        // Editing: single record update (department cannot change mid-edit)
        const url = `/api/schools/${schoolSlug}/timetable/periods/${editingId}`;
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            startTime: start,
            endTime: end,
          }),
        });
        if (res.ok) {
          toast.success("Period updated");
          resetForm();
          fetchPeriods();
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to update period");
        }
      } else {
        // Creating: one period per selected department (or school-wide)
        const url = `/api/schools/${schoolSlug}/timetable/periods`;

        // Build the sortOrder count based on current periods for the scope
        const baseSortOrder = periods.length;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            startTime: start,
            endTime: end,
            sortOrder: baseSortOrder,
            // Pass the resolved dept ids; empty array = school-wide
            departmentIds: effectiveDeptIds,
          }),
        });

        if (res.ok) {
          const pluralMsg =
            effectiveDeptIds.length > 1
              ? `Period added for ${effectiveDeptIds.length} departments`
              : "Period added";
          toast.success(pluralMsg);
          resetForm();
          fetchPeriods();
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to save period");
        }
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/timetable/periods/${id}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        toast.success("Period deleted");
        fetchPeriods();
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p: PeriodTemplate) => {
    setEditingId(p.id);
    setName(p.name);
    setStart(p.startTime);
    setEnd(p.endTime);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleGenerateWeek = async () => {
    if (periods.length === 0) {
      return toast.error("Define your periods first before generating the week");
    }
    if (selectedDays.length === 0) {
      return toast.error("Select at least one day");
    }

    setGenerating(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/timetable/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          days: selectedDays,
          // Pass array; empty = school-wide (null) handled by the API
          departmentIds: effectiveDeptIds.length > 0 ? effectiveDeptIds : [null],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.error || "Failed to generate slots");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setGenerating(false);
    }
  };

  const duration = (s: string, e: string) => {
    const [sh, sm] = s.split(":").map(Number);
    const [eh, em] = e.split(":").map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  // Filter displayed periods to only those matching the current scopes
  const scopedPeriods = periods.filter((p) => {
    if (scopes.includes(SCOPE_ALL)) return p.departmentId === null;
    if (p.departmentId === null) return false; // don't show school-wide when filtering by dept
    return scopes.includes(p.departmentId);
  });

  // Build a human-readable label for the current scope selection
  const scopeLabel =
    scopes.includes(SCOPE_ALL) || scopes.length === 0
      ? "All Departments (School-wide)"
      : scopes.length === 1
        ? departments.find((d) => d.id === scopes[0])?.name ?? "Department"
        : `${scopes.length} Departments`;

  return (
    <div className="space-y-6">
      {/* Department / Scope selector */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" />
            Configure Schedule For
          </CardTitle>
          <CardDescription className="text-xs">
            Each department can have completely different period times. Select one or more
            departments whose schedule you want to define, or choose{" "}
            <span className="font-semibold">All Departments</span> to set a shared school-wide
            schedule. Selecting multiple departments will apply the same periods to all of them.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <MultiSelect
            options={scopeOptions}
            selected={scopes}
            onChange={(vals) => {
              if (vals.length === 0) {
                // Always keep at least one selection; fall back to school-wide
                setScopes([SCOPE_ALL]);
              } else {
                // If user explicitly picks SCOPE_ALL, clear other selections
                const addedAll = vals.includes(SCOPE_ALL) && !scopes.includes(SCOPE_ALL);
                if (addedAll) {
                  setScopes([SCOPE_ALL]);
                } else {
                  // If a real dept is picked while SCOPE_ALL was there, remove SCOPE_ALL
                  setScopes(vals.filter((v) => v !== SCOPE_ALL));
                }
              }
            }}
            placeholder="Select departments..."
            className="w-full md:w-[480px]"
          />
          {scopes.length > 1 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <span className="font-semibold">Note:</span> Adding a period will create one template
              entry per selected department using the same times.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Step 1: Define Periods ────────────────────────────────────────── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Step 1 — Define Periods for{" "}
            <Badge variant="secondary" className="font-mono text-xs">{scopeLabel}</Badge>
          </CardTitle>
          <CardDescription>
            Define each period once (e.g. "Period 1: 08:00–08:45", "Lunch: 12:00–13:00").
            No days needed here — generate the full week in Step 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Period Name</label>
              <Input
                placeholder="e.g. Period 1, Lunch Break"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Start</label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">End</label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingId ? (
                  <><Check className="w-4 h-4 mr-1" /> Update</>
                ) : (
                  <><Plus className="w-4 h-4 mr-1" /> Add</>
                )}
              </Button>
              {editingId && (
                <Button variant="outline" size="icon" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Period list */}
          {loadingPeriods ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : scopedPeriods.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground italic py-4">
              No periods defined for {scopeLabel} yet.
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Name</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedPeriods.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                      </TableCell>
                      <TableCell className="font-semibold">{p.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {p.startTime} – {p.endTime}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          {duration(p.startTime, p.endTime)} min
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.departmentId ? (
                          <Badge variant="outline" className="text-xs">
                            {p.department?.name || "Dept"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs opacity-60">
                            School-wide
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => startEdit(p)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{p.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the period template. Existing time slots
                                  already generated from it will not be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(p.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Step 2: Generate the Week ────────────────────────────────────── */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-500" />
            Step 2 — Generate the Full Week for{" "}
            <Badge variant="secondary" className="font-mono text-xs">{scopeLabel}</Badge>
          </CardTitle>
          <CardDescription>
            Select which days to generate and click Generate. The system will create time slots
            for every period above across the selected days — for all selected departments. Safe to
            re-run — duplicates are skipped automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4 space-y-4">
          <div className="flex flex-wrap gap-4">
            {WEEKDAYS.map((day) => (
              <div key={day} className="flex items-center gap-2">
                <Checkbox
                  id={`day-${day}`}
                  checked={selectedDays.includes(day)}
                  onCheckedChange={() => toggleDay(day)}
                />
                <Label htmlFor={`day-${day}`} className="cursor-pointer text-sm capitalize">
                  {day.charAt(0) + day.slice(1).toLowerCase()}
                </Label>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Will generate{" "}
              <span className="font-semibold text-foreground">
                {scopedPeriods.length} period(s) × {selectedDays.length} day(s)
                {effectiveDeptIds.length > 1 ? ` × ${effectiveDeptIds.length} dept(s)` : ""} ={" "}
                {scopedPeriods.length * selectedDays.length * Math.max(effectiveDeptIds.length, 1)}{" "}
                slot(s)
              </span>{" "}
              for <span className="font-semibold text-foreground">{scopeLabel}</span>{" "}
              (skipping existing ones).
            </p>
            <Button
              onClick={handleGenerateWeek}
              disabled={generating || scopedPeriods.length === 0 || selectedDays.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Generate Week
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
