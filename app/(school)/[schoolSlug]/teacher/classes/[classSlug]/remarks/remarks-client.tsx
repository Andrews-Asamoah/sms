"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatStudentName } from "@/lib/utils/name-formatter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save, Sparkles, CheckCircle2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Behavioral Trait Definitions --------------------------------------------

const CONDUCT_OPTIONS = [
  "Exemplary",
  "Very Good",
  "Satisfactory",
  "Needs Improvement",
  "Unsatisfactory",
];

const ATTITUDE_OPTIONS = [
  "Outstanding",
  "Enthusiastic",
  "Cooperative",
  "Passive",
  "Disruptive",
];

const PUNCTUALITY_OPTIONS = [
  "Always on time",
  "Usually on time",
  "Occasionally late",
  "Frequently late",
  "Needs significant improvement",
];

// --- Types --------------------------------------------------------------------

interface StudentRemark {
  conduct: string;
  attitude: string;
  punctuality: string;
  general: string;
  headteacher: string;
  isGenerating?: boolean;
}

interface RemarksClientProps {
  schoolSlug: string;
  classId: string;
  termId: string;
  students: any[];
  effectiveRole: string;
}

// --- Helper: is a row "complete"? --------------------------------------------
function isRowComplete(r: StudentRemark) {
  return r.conduct && r.attitude && r.punctuality && r.general.trim();
}

function hasTraits(r: StudentRemark) {
  return r.conduct && r.attitude && r.punctuality;
}

// --- Main Component -----------------------------------------------------------

export function RemarksClient({
  schoolSlug,
  classId,
  termId,
  students,
  effectiveRole,
}: RemarksClientProps) {
  const [remarks, setRemarks] = useState<Record<string, StudentRemark>>({});
  // Snapshot of the last persisted state - used for dirty tracking
  const savedRemarks = useRef<Record<string, StudentRemark>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [dirtyCount, setDirtyCount] = useState(0);
  const isHeadteacher =
    effectiveRole === "headteacher" ||
    effectiveRole === "admin" ||
    effectiveRole === "owner";

  // -- Load existing remarks --------------------------------------------------
  useEffect(() => {
    const fetchExistingRemarks = async () => {
      setLoading(true);
      try {
        const initialMap: Record<string, StudentRemark> = {};

        // Single batch API call — fetch ALL remarks for the class+term at once
        const res = await fetch(
          `/api/schools/${schoolSlug}/remarks?classId=${classId}&termId=${termId}`,
        );
        const allRemarks: any[] = res.ok ? await res.json() : [];

        // Group remarks by studentId for O(1) lookups
        const remarksByStudent = new Map<string, any[]>();
        for (const r of allRemarks) {
          const list = remarksByStudent.get(r.studentId) || [];
          list.push(r);
          remarksByStudent.set(r.studentId, list);
        }

        students.forEach((student) => {
          const data = remarksByStudent.get(student.id) || [];

          const generalRm =
            data.find((r: any) => r.remarkType === "GENERAL")?.content || "";
          const headteacherRm =
            data.find((r: any) => r.remarkType === "HEADTEACHER")?.content || "";
          const behavioralRm = data.find(
            (r: any) => r.remarkType === "BEHAVIORAL",
          )?.content;

          let conduct = "";
          let attitude = "";
          let punctuality = "";

          if (behavioralRm) {
            try {
              const parsed = JSON.parse(behavioralRm);
              if (Array.isArray(parsed)) {
                conduct =
                  parsed.find((r: any) => r.pillar === "CONDUCT")?.value || "";
                attitude =
                  parsed.find((r: any) => r.pillar === "ATTITUDE")?.value || "";
                punctuality =
                  parsed.find((r: any) => r.pillar === "PUNCTUALITY")
                    ?.value || "";
              } else if (typeof parsed === "object") {
                conduct = parsed.conduct || "";
                attitude = parsed.attitude || "";
                punctuality = parsed.punctuality || "";
              }
            } catch {
              // ignore parse errors
            }
          }

          initialMap[student.id] = {
            conduct,
            attitude,
            punctuality,
            general: generalRm,
            headteacher: headteacherRm,
          };
        });

        // Deep-clone for dirty tracking baseline
        savedRemarks.current = JSON.parse(JSON.stringify(initialMap));
        setRemarks(initialMap);
      } catch {
        toast.error("Failed to load existing remarks.");
      } finally {
        setLoading(false);
      }
    };

    fetchExistingRemarks();
  }, [schoolSlug, classId, students, termId]);

  // -- Dirty count updater ---------------------------------------------------
  const recomputeDirty = useCallback(
    (updated: Record<string, StudentRemark>) => {
      const count = Object.keys(updated).filter((id) => {
        const cur = updated[id];
        const sav = savedRemarks.current[id];
        if (!sav)
          return !!(
            cur.conduct ||
            cur.attitude ||
            cur.punctuality ||
            cur.general.trim() ||
            cur.headteacher.trim()
          );
        return (
          cur.conduct !== sav.conduct ||
          cur.attitude !== sav.attitude ||
          cur.punctuality !== sav.punctuality ||
          cur.general !== sav.general ||
          cur.headteacher !== sav.headteacher
        );
      }).length;
      setDirtyCount(count);
    },
    [],
  );

  // -- Field updater ---------------------------------------------------------
  const updateField = useCallback(
    (
      studentId: string,
      field: keyof StudentRemark,
      value: string | boolean,
    ) => {
      setRemarks((prev) => {
        const updated = {
          ...prev,
          [studentId]: { ...prev[studentId], [field]: value },
        };
        // Don't count isGenerating as a dirty change
        if (field !== "isGenerating") recomputeDirty(updated);
        return updated;
      });
    },
    [recomputeDirty],
  );

  // -- Generate remark for a single student ---------------------------------
  const generateForStudent = useCallback(
    async (studentId: string, studentName: string) => {
      const row = remarks[studentId];
      if (!row?.conduct || !row?.attitude || !row?.punctuality) {
        toast.error("Please select Conduct, Attitude and Punctuality first.");
        return;
      }

      updateField(studentId, "isGenerating", true);
      try {
        const res = await fetch(
          `/api/schools/${schoolSlug}/report-cards/ai-narrative`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentName,
              conduct: row.conduct,
              attitude: row.attitude,
              punctuality: row.punctuality,
            }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        updateField(studentId, "general", data.narrative);
        toast.success(`Remark generated for ${studentName}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to generate remark",
        );
      } finally {
        updateField(studentId, "isGenerating", false);
      }
    },
    [remarks, schoolSlug, updateField],
  );

  // -- Generate all remarks — single batch API call (highly efficient) -------
  const generateAll = useCallback(async () => {
    const pending = students.filter((s) => {
      const r = remarks[s.id];
      return r && hasTraits(r) && !r.general.trim();
    });

    if (pending.length === 0) {
      toast.info("No students with traits but missing a remark.");
      return;
    }

    setGeneratingAll(true);
    toast.info(`Generating remarks for ${pending.length} students…`);

    try {
      const payloadStudents = pending.map((s) => {
        const r = remarks[s.id];
        return {
          studentId: s.id,
          studentName: `${s.firstName} ${s.lastName}`,
          conduct: r.conduct,
          attitude: r.attitude,
          punctuality: r.punctuality,
        };
      });

      const res = await fetch(
        `/api/schools/${schoolSlug}/report-cards/ai-narrative`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ students: payloadStudents }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to generate narratives");
      }

      const data = await res.json();
      
      // Update each student's general remark in state
      setRemarks((prev) => {
        const updated = { ...prev };
        data.results.forEach((resItem: any) => {
          if (resItem.studentId && resItem.narrative) {
            updated[resItem.studentId] = {
              ...updated[resItem.studentId],
              general: resItem.narrative,
            };
          }
        });
        
        // Recompute dirty counts on the new state
        recomputeDirty(updated);
        return updated;
      });

      toast.success(`Auto-generation complete! ${pending.length} remarks generated.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate all remarks.");
    } finally {
      setGeneratingAll(false);
    }
  }, [students, remarks, schoolSlug, recomputeDirty]);

  // -- Save All (dirty-only) -------------------------------------------------
  const handleSaveAll = async () => {
    // Collect only students with changes
    const dirtyStudents = students.filter((student) => {
      const cur = remarks[student.id];
      const sav = savedRemarks.current[student.id];
      if (!cur) return false;
      if (!sav) {
        return !!(
          cur.conduct ||
          cur.attitude ||
          cur.punctuality ||
          cur.general.trim() ||
          cur.headteacher.trim()
        );
      }
      return (
        cur.conduct !== sav.conduct ||
        cur.attitude !== sav.attitude ||
        cur.punctuality !== sav.punctuality ||
        cur.general !== sav.general ||
        cur.headteacher !== sav.headteacher
      );
    });

    if (dirtyStudents.length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        dirtyStudents.map(async (student) => {
          const r = remarks[student.id];
          const sav = savedRemarks.current[student.id];
          if (!r) return;

          const payload = [];

          // Save GENERAL only if changed and non-empty
          const generalChanged = r.general !== (sav?.general ?? "");
          if (generalChanged && r.general.trim()) {
            payload.push(
              fetch(`/api/schools/${schoolSlug}/remarks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  studentId: student.id,
                  termId,
                  remarkType: "GENERAL",
                  content: r.general,
                }),
              }),
            );
          }

          // Save HEADTEACHER remark only if changed and user is headteacher/admin
          if (isHeadteacher) {
            const headteacherChanged = r.headteacher !== (sav?.headteacher ?? "");
            if (headteacherChanged && r.headteacher.trim()) {
              payload.push(
                fetch(`/api/schools/${schoolSlug}/remarks`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    studentId: student.id,
                    termId,
                    remarkType: "HEADTEACHER",
                    content: r.headteacher,
                  }),
                }),
              );
            }
          }

          // Save BEHAVIORAL only if any trait changed
          const behavioralChanged =
            r.conduct !== (sav?.conduct ?? "") ||
            r.attitude !== (sav?.attitude ?? "") ||
            r.punctuality !== (sav?.punctuality ?? "");
          if (behavioralChanged && (r.conduct || r.attitude || r.punctuality)) {
            payload.push(
              fetch(`/api/schools/${schoolSlug}/remarks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  studentId: student.id,
                  termId,
                  remarkType: "BEHAVIORAL",
                  content: JSON.stringify({
                    conduct: r.conduct,
                    attitude: r.attitude,
                    punctuality: r.punctuality,
                  }),
                }),
              }),
            );
          }

          if (payload.length > 0) await Promise.all(payload);
        }),
      );

      // Update saved snapshot for dirty tracking
      savedRemarks.current = JSON.parse(JSON.stringify(remarks));
      setDirtyCount(0);
      toast.success(
        `${dirtyStudents.length} student${dirtyStudents.length > 1 ? "s'" : "'s"} remarks saved.`,
      );
    } catch {
      toast.error("An error occurred while saving remarks.");
    } finally {
      setSaving(false);
    }
  };

  // --- Render ---------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 bg-muted/20 border rounded-xl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">
          Loading class roster and remarks…
        </p>
      </div>
    );
  }

  const completedCount = students.filter((s) =>
    isRowComplete(remarks[s.id] || {}),
  ).length;
  const withTraitsCount = students.filter((s) =>
    hasTraits(remarks[s.id] || {}),
  ).length;
  const pendingAICount = students.filter((s) => {
    const r = remarks[s.id];
    return r && hasTraits(r) && !r.general.trim();
  }).length;

  return (
    <div className="space-y-4">
      {/* -- Top Bar -- */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="text-sm px-3 py-1">
            {students.length} Students
          </Badge>
          <Badge
            className={cn(
              "text-sm px-3 py-1",
              completedCount === students.length
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                : "bg-amber-100 text-amber-800 hover:bg-amber-100",
            )}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {completedCount}/{students.length} Complete
          </Badge>
          {pendingAICount > 0 && (
            <span className="text-xs text-muted-foreground">
              {pendingAICount} student{pendingAICount > 1 ? "s" : ""} with
              traits but no remark yet
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pendingAICount > 0 && (
            <Button
              variant="outline"
              onClick={generateAll}
              disabled={generatingAll || saving}
              className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400"
            >
              {generatingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Auto-Generate All ({pendingAICount})
            </Button>
          )}
          <Button
            onClick={handleSaveAll}
            disabled={saving || generatingAll}
            className="min-w-[140px]"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {dirtyCount > 0
              ? `Save ${dirtyCount} Change${dirtyCount > 1 ? "s" : ""}`
              : "Save Remarks"}
          </Button>
        </div>
      </div>

      {/* -- Table -- */}
      <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[180px] font-semibold">Student</TableHead>
              <TableHead className="w-[160px] font-semibold">Traits</TableHead>
              <TableHead className="font-semibold">Class Teacher's Remark</TableHead>
              {isHeadteacher && (
                <TableHead className="font-semibold">Headmaster's Remark</TableHead>
              )}
              <TableHead className="w-[48px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student, idx) => {
              const r = remarks[student.id] || {
                conduct: "",
                attitude: "",
                punctuality: "",
                general: "",
                headteacher: "",
              };
              const fullName = formatStudentName(
                student.firstName,
                student.lastName,
                student.otherNames,
              );
              const complete = isRowComplete(r);
              const traits = hasTraits(r);

              return (
                <TableRow
                  key={student.id}
                  className={cn(
                    "align-top",
                    idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                    complete && "bg-emerald-50/40 dark:bg-emerald-950/10",
                  )}
                >
                  {/* Student */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {student.firstName.charAt(0)}
                        {student.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight">
                          {fullName}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {student.admissionNumber || "-"}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Traits (stacked) */}
                  <TableCell className="py-3 align-top">
                    <div className="flex flex-col gap-1.5">
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">🤝 Conduct</p>
                        <Select
                          value={r.conduct}
                          onValueChange={(v) =>
                            updateField(student.id, "conduct", v)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDUCT_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt} className="text-xs">
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">⭐ Attitude</p>
                        <Select
                          value={r.attitude}
                          onValueChange={(v) =>
                            updateField(student.id, "attitude", v)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {ATTITUDE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt} className="text-xs">
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">⏰ Punctuality</p>
                        <Select
                          value={r.punctuality}
                          onValueChange={(v) =>
                            updateField(student.id, "punctuality", v)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {PUNCTUALITY_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt} className="text-xs">
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TableCell>

                  {/* Remark */}
                  <TableCell className="py-3 align-top">
                    <Textarea
                      placeholder={
                        traits
                          ? "Click ✨ to auto-generate, or type manually…"
                          : "Select traits first to enable AI generation…"
                      }
                      value={r.general}
                      onChange={(e) =>
                        updateField(student.id, "general", e.target.value)
                      }
                      className="text-xs min-h-[120px] resize-none focus-visible:ring-primary/50 w-full"
                      rows={5}
                    />
                  </TableCell>

                  {/* Headmaster's Remark */}
                  {isHeadteacher && (
                    <TableCell className="py-3 align-top">
                      <Textarea
                        placeholder="Enter Headmaster's remark for this student…"
                        value={r.headteacher}
                        onChange={(e) =>
                          updateField(student.id, "headteacher", e.target.value)
                        }
                        className="text-xs min-h-[120px] resize-none focus-visible:ring-primary/50 w-full"
                        rows={5}
                      />
                    </TableCell>
                  )}

                  {/* AI Generate Button */}
                  <TableCell className="py-3 align-top">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={
                        traits
                          ? "Generate AI remark"
                          : "Select conduct, attitude & punctuality first"
                      }
                      disabled={!traits || !!r.isGenerating}
                      onClick={() =>
                        generateForStudent(
                          student.id,
                          `${student.firstName} ${student.lastName}`,
                        )
                      }
                      className={cn(
                        "h-9 w-9 rounded-lg transition-all mt-1",
                        traits
                          ? "text-purple-600 hover:bg-purple-50 cursor-pointer hover:text-purple-700 dark:hover:bg-purple-950"
                          : "text-muted-foreground",
                      )}
                    >
                      {r.isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* -- Bottom Save Bar -- */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveAll}
          disabled={saving || generatingAll}
          size="lg"
          className="min-w-[160px]"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {dirtyCount > 0
            ? `Save ${dirtyCount} Change${dirtyCount > 1 ? "s" : ""}`
            : "Save Remarks"}
        </Button>
      </div>
    </div>
  );
}
