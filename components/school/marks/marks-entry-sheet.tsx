"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Clock,
  Send,
  MessageSquare,
  Download,
  Upload,
  FileSpreadsheet,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  saveMarksEntry,
  submitGradebookForReview,
  requestGradebookEdit 
} from "@/app/(school)/[schoolSlug]/teacher/classes/[classSlug]/gradebook/actions";
import { downloadMarksTemplate, parseMarksExcel, type ParsedStudentMarks } from "@/lib/excel-marks";

import { MarksEntrySheetProps } from "@/app/(school)/[schoolSlug]/teacher/classes/[classSlug]/gradebook/types";

// Helper to calculate average of valid numbers in an array
const getAverage = (arr: (number | "")[]) => {
  const valid = arr.filter(
    (v): v is number => typeof v === "number" && !isNaN(v),
  );
  if (valid.length === 0) return 0;
  return valid.reduce((sum, val) => sum + val, 0) / valid.length;
};

export function MarksEntrySheet({
  students,
  template,
  existingScores,
  schoolSlug,
  classId,
  subjectId,
  termId,
  extension,
  isPublished = false,
  forceReadOnly = false,
  isAdminView = false,
  className,
}: MarksEntrySheetProps & { forceReadOnly?: boolean; isAdminView?: boolean }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // ── Excel Upload State ──────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    parsedStudents: ParsedStudentMarks[];
    warnings: string[];
    allWarnings: string[];
  } | null>(null);

  // Locking Logic
  const now = new Date();
  const deadline = template.deadline ? new Date(template.deadline) : null;
  const extDeadline = extension?.deadline ? new Date(extension.deadline) : null;
  const effectiveDeadline = extDeadline || deadline;
  // Compare dates only (strip time) so a deadline of "21/03/2026" is not
  // considered passed when the current time is still on 20/03/2026 at night.
  const todayStr = now.toDateString();
  const isDeadlinePassed = effectiveDeadline
    ? new Date(todayStr) > new Date(effectiveDeadline.toDateString())
    : false;
  const isGlobalLocked = template.isLocked;
  
  // New: Check if any student has FINAL/REVIEWED status (Strict locking after approval)
  const isApproved = useMemo(() => existingScores.some((s) => s.status === "FINAL"), [existingScores]);
  const isReviewed = useMemo(() => existingScores.some((s) => s.status === "REVIEWED"), [existingScores]);

  const isSystemLocked =
    forceReadOnly || isPublished || isGlobalLocked || isDeadlinePassed || isApproved || isReviewed;

  const [isRequestingEdit, setIsRequestingEdit] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const handleRequestEdit = async () => {
    if (!requestReason.trim()) {
      toast.error("Please provide a reason for the edit request");
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const result = await requestGradebookEdit({
        schoolSlug,
        classId,
        subjectId,
        termId,
        reason: requestReason,
      });

      if (result.success) {
        toast.success(result.message);
        setIsRequestingEdit(false);
        setRequestReason("");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to send edit request");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Get remarks if any (usually from the first student if batch rejected)
  const reviewerRemarks = existingScores.find((s) => s.remarks)?.remarks;

  // State to hold marks: Record<studentId, Record<componentId, number | "" | (number | "")[]>>
  const [marksData, setMarksData] = useState<
    Record<string, Record<string, number | "" | (number | "")[]>>
  >({});

  // Initialize state from existing scores
  useEffect(() => {
    const initialData: Record<
      string,
      Record<string, number | "" | (number | "")[]>
    > = {};

    students.forEach((student) => {
      initialData[student.id] = {};

      // Initialize with empty strings or arrays for all components
      template.components.forEach((comp) => {
        if (comp.isRepeatable && comp.expectedCount) {
          initialData[student.id][comp.id] = Array(comp.expectedCount).fill("");
        } else {
          initialData[student.id][comp.id] = "";
        }
      });

      const studentScores = existingScores.find(
        (s) => s.studentId === student.id,
      );

      if (studentScores) {
        studentScores.componentScores.forEach((cs) => {
          const comp = template.components.find((c) => c.id === cs.componentId);
          if (
            comp?.isRepeatable &&
            cs.rawScores &&
            Array.isArray(cs.rawScores)
          ) {
            // Fill array based on expected count, padding with "" if needed
            const expectedCount = comp.expectedCount || 1;
            const arr = Array(expectedCount).fill("");
            for (
              let i = 0;
              i < Math.min(cs.rawScores.length, expectedCount);
              i++
            ) {
              arr[i] =
                typeof cs.rawScores[i] === "number" ? cs.rawScores[i] : "";
            }
            initialData[student.id][cs.componentId] = arr;
          } else {
            initialData[student.id][cs.componentId] = Number(cs.marksObtained);
          }
        });
      }
    });

    setMarksData(initialData);
  }, [students, existingScores, template]);

  // Before-unload warning to prevent data loss with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes in your gradebook. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleMarkChange = (
    studentId: string,
    componentId: string,
    value: string,
    index?: number,
  ) => {
    if (isSystemLocked) return;

    setMarksData((prev) => {
      const studentMarks = { ...prev[studentId] };
      const valToSave = value === "" ? "" : parseFloat(value);

      if (typeof index === "number") {
        // Handle array update for repeatable component
        const currentArr = Array.isArray(studentMarks[componentId])
          ? [...(studentMarks[componentId] as (number | "")[])]
          : [];
        currentArr[index] = Number.isNaN(valToSave) ? "" : valToSave;
        studentMarks[componentId] = currentArr;
      } else {
        // Handle single value update
        studentMarks[componentId] = Number.isNaN(valToSave) ? "" : valToSave;
      }

      return {
        ...prev,
        [studentId]: studentMarks,
      };
    });
    setHasUnsavedChanges(true);
  };

  // Calculate Derived Stats (Total, Grade) for a student
  const getStudentStats = (studentId: string) => {
    const studentMarks = marksData[studentId] || {};
    let totalWeightedScore = 0;
    let totalMaxWeight = 0;
    let hasEntries = false;

    template.components.forEach((comp) => {
      const mark = studentMarks[comp.id];
      let averagedOrSingleMark: number | null = null;

      if (Array.isArray(mark)) {
        const valid = mark.filter((v): v is number => typeof v === "number");
        if (valid.length > 0) {
          hasEntries = true;
          averagedOrSingleMark = getAverage(mark);
        }
      } else if (typeof mark === "number") {
        hasEntries = true;
        averagedOrSingleMark = mark;
      }

      if (averagedOrSingleMark !== null) {
        const weighted =
          (averagedOrSingleMark / Number(comp.maxMarks)) * Number(comp.weight);
        totalWeightedScore += weighted;
      }
      totalMaxWeight += Number(comp.weight);
    });

    if (!hasEntries) return null;

    const percentage =
      totalMaxWeight > 0 ? (totalWeightedScore / totalMaxWeight) * 100 : 0;

    const gradeScale = template.gradingSystem.gradeScales
      .sort((a, b) => Number(b.minScore) - Number(a.minScore))
      .find((scale) => percentage >= Number(scale.minScore));

    const gradeStr = gradeScale ? gradeScale.grade : "9";
    const gradeNum = parseInt(gradeStr);

    let colorClass =
      "text-muted-foreground border-muted-foreground/30 bg-muted/10";
    if (!isNaN(gradeNum)) {
      if (gradeNum === 1)
        colorClass =
          "text-emerald-600 dark:text-emerald-400 border-emerald-500/50 bg-emerald-500/10 font-bold";
      else if (gradeNum === 2)
        colorClass =
          "text-green-600 dark:text-green-400 border-green-500/50 bg-green-500/10";
      else if (gradeNum <= 4)
        colorClass =
          "text-lime-600 dark:text-lime-400 border-lime-500/50 bg-lime-500/10";
      else if (gradeNum <= 6)
        colorClass =
          "text-yellow-600 dark:text-yellow-400 border-yellow-500/50 bg-yellow-500/10";
      else if (gradeNum <= 8)
        colorClass =
          "text-orange-600 dark:text-orange-400 border-orange-500/50 bg-orange-500/10";
      else if (gradeNum >= 9)
        colorClass =
          "text-red-600 dark:text-red-400 border-red-500/50 bg-red-500/10";
    } else {
      if (["A", "B"].some((g) => gradeStr.startsWith(g)))
        colorClass =
          "text-emerald-600 dark:text-emerald-400 border-emerald-500/50 bg-emerald-500/10 font-bold";
      else if (gradeStr.startsWith("C"))
        colorClass =
          "text-yellow-600 dark:text-yellow-400 border-yellow-500/50 bg-yellow-500/10";
      else
        colorClass =
          "text-red-600 dark:text-red-400 border-red-500/50 bg-red-500/10";
    }

    return {
      total: percentage.toFixed(1),
      grade: gradeStr,
      color: colorClass,
    };
  };

  const hasInvalidMarks = useMemo(() => {
    return students.some((student) => {
      const studentMarks = marksData[student.id] || {};
      return template.components.some((comp) => {
        const mark = studentMarks[comp.id];

        if (Array.isArray(mark)) {
          return mark.some(
            (m) =>
              typeof m === "number" && (m > Number(comp.maxMarks) || m < 0),
          );
        }

        return (
          typeof mark === "number" && (mark > Number(comp.maxMarks) || mark < 0)
        );
      });
    });
  }, [students, template.components, marksData]);

  // ── Excel Download ────────────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const safeTemplateName = template.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const safeClassName = className ? `_${className.replace(/[^a-z0-9]/gi, "_").toLowerCase()}` : "";
    downloadMarksTemplate(
      template,
      students,
      marksData,
      `marks_${safeTemplateName}${safeClassName}`
    );
    toast.success("Template downloaded. Fill in the marks and upload it back.");
  };

  // ── Excel Upload ─────────────────────────────────────────────────────────
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-uploaded if needed
    e.target.value = "";

    if (!file.name.match(/\.xlsx?$/i)) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setIsParsingExcel(true);
    try {
      const result = await parseMarksExcel(file, template);

      if (!result.success) {
        toast.error(result.error ?? "Failed to parse the uploaded file.");
        return;
      }

      // Collect all row-level warnings
      const allWarnings = [
        ...result.warnings,
        ...result.students.flatMap((s) => s.warnings),
      ];

      // Show preview/confirmation dialog
      setImportPreview({
        parsedStudents: result.students,
        warnings: result.warnings,
        allWarnings,
      });
    } catch (err) {
      console.error("Excel parse error:", err);
      toast.error("An unexpected error occurred while reading the file.");
    } finally {
      setIsParsingExcel(false);
    }
  };

  const applyImportedMarks = () => {
    if (!importPreview) return;

    setMarksData((prev) => {
      const updated = { ...prev };
      let applied = 0;

      for (const parsed of importPreview.parsedStudents) {
        // Only apply for students that are actually in the current class
        if (!updated[parsed.studentId]) continue;

        const studentMarks = { ...updated[parsed.studentId] };
        for (const [componentId, value] of Object.entries(parsed.marks)) {
          if (
            value !== "" &&
            !(Array.isArray(value) && value.every((v) => v === ""))
          ) {
            studentMarks[componentId] = value;
            applied++;
          }
        }
        updated[parsed.studentId] = studentMarks;
      }

      if (applied > 0) {
        toast.success(
          `Successfully imported marks for ${importPreview.parsedStudents.filter(
            (s) => updated[s.studentId]
          ).length} students.`
        );
        setHasUnsavedChanges(true);
      } else {
        toast.warning("No marks were imported — the file may have been empty.");
      }

      return updated;
    });

    setImportPreview(null);
  };

  const handleSave = async () => {
    if (hasInvalidMarks) {
      toast.error("Please correct invalid marks before saving");
      return;
    }

    setIsSaving(true);

    try {
      const payload = students
        .map((student) => {
          const studentMarks = marksData[student.id] || {};
          const componentScores = Object.entries(studentMarks)
            .filter(([_, mark]) => {
              if (Array.isArray(mark))
                return mark.some((m) => typeof m === "number");
              return typeof mark === "number";
            })
            .map(([componentId, mark]) => ({
              componentId,
              marks: mark as number | (number | "")[],
            }));

          return {
            studentId: student.id,
            componentScores,
          };
        })
        .filter((s) => s.componentScores.length > 0);

      if (payload.length === 0) {
        toast.error("No marks entered to save");
        return;
      }

      const result = await saveMarksEntry({
        schoolSlug,
        classId,
        subjectId,
        termId,
        templateId: template.id,
        status: "DRAFT",
        marks: payload,
      });

      if (result.success) {
        toast.success("Marks saved successfully");
        setHasUnsavedChanges(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save marks");
    } finally {
      setIsSaving(false);
    }
  };

  // Lightweight submit: only changes DRAFT → SUBMITTED status, no marks reprocessing
  const handleSubmitForReview = async () => {
    if (hasUnsavedChanges) {
      toast.error("You have unsaved changes. Please save your marks first before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitGradebookForReview({
        schoolSlug,
        classId,
        subjectId,
        termId,
        templateId: template.id,
      });

      if (result.success) {
        toast.success(result.message ?? "Gradebook submitted for review");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit for review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Action Bar (sticky within the page, no border card) ────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl bg-card border px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold tracking-tight">Marks Entry Sheet</h2>
              <Badge variant="secondary" className="text-xs font-medium">
                {template.name}
              </Badge>
              {hasUnsavedChanges && (
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Unsaved
                </Badge>
              )}
            </div>
            {effectiveDeadline && !isSystemLocked && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Deadline: <span className="font-medium text-foreground/80">{effectiveDeadline.toLocaleString()}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Excel download button — always available */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50"
            onClick={handleDownloadTemplate}
            title="Download an Excel template with student names pre-filled"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span> Template
          </Button>

          {/* Excel upload button — only when not locked */}
          {!isSystemLocked && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelected}
                aria-label="Upload Excel marks file"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsingExcel}
                title="Upload a filled-in Excel marks file"
              >
                {isParsingExcel ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Upload</span> Marks
              </Button>
            </>
          )}

          {/* Save / Submit — hidden in admin view */}
          {!isAdminView && (
            <>
              <Separator orientation="vertical" className="h-6 mx-0.5 hidden sm:block" />

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4"
                onClick={handleSave}
                disabled={
                  isSaving ||
                  isSubmitting ||
                  !hasUnsavedChanges ||
                  hasInvalidMarks ||
                  isSystemLocked
                }
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save Draft
              </Button>
              <Button
                size="sm"
                className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSubmitForReview}
                disabled={
                  isSaving || isSubmitting || hasInvalidMarks || isSystemLocked || hasUnsavedChanges
                }
                title={hasUnsavedChanges ? "Save your marks first before submitting" : "Submit gradebook for admin review"}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                )}
                Submit for Review
              </Button>
            </>
          )}

        </div>
      </div>

      {isSystemLocked && !isAdminView && (
        <Card
          className={
            isPublished
              ? "border-blue-500/20 bg-blue-500/5"
              : isApproved || isReviewed
              ? "border-amber-500/20 bg-amber-500/5"
              : "border-destructive/20 bg-destructive/5"
          }
        >
          <CardContent className="flex items-center gap-4 p-4">
            <Lock
              className={`h-5 w-5 shrink-0 ${
                isPublished
                  ? "text-blue-600"
                  : isApproved || isReviewed
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600"
              }`}
            />
            <div className="flex-1">
              {isPublished ? (
                <>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Report cards have been published.
                  </p>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                    This gradebook is now read-only. Contact your administrator
                    if changes are needed.
                  </p>
                </>
              ) : isApproved || isReviewed ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Marks have been finalized by the administration.
                    </p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                      These marks are now locked. Request edit access if you need to make corrections.
                    </p>
                  </div>
                  {!isAdminView && (
                    <Dialog open={isRequestingEdit} onOpenChange={setIsRequestingEdit}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-background border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 h-8 shrink-0">
                          Request Edit Access
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Request Edit Access</DialogTitle>
                          <DialogDescription>
                            Explain why you need to make changes to this approved gradebook. Your request will be sent to the Class HOD and School Admins.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-2">
                          <Textarea
                            placeholder="e.g. I accidentally entered the wrong marks for Class Test 2..."
                            value={requestReason}
                            onChange={(e) => setRequestReason(e.target.value)}
                            className="min-h-[120px] bg-background resize-none"
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setIsRequestingEdit(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleRequestEdit} 
                            disabled={isSubmittingRequest || !requestReason.trim()}
                          >
                            {isSubmittingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Request
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-destructive dark:text-red-400">
                    Marks entry is currently locked.
                  </p>
                  <p className="text-xs text-destructive/80 dark:text-red-400/80">
                    {isGlobalLocked
                      ? "Administrator has locked this assessment."
                      : `Deadline (${effectiveDeadline?.toLocaleDateString()}) has passed.`}{" "}
                    Contact admin for an extension.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {reviewerRemarks && !isSystemLocked && (
        <Card className="border-amber-500/20 bg-amber-500/5 animate-pulse-subtle">
          <CardContent className="flex items-start gap-4 p-4">
            <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
              <MessageSquare className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                Reviewer Feedback
              </p>
              <p className="text-sm text-amber-600/90 dark:text-amber-400/80 italic mt-1 pb-1">
                "{reviewerRemarks}"
              </p>
              <p className="text-[10px] text-amber-500 border-t border-amber-500/10 pt-2 font-medium">
                Please address the feedback above and re-submit for review.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Marks Table ───────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[750px] scrollbar-thin">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="sticky top-0 z-20 bg-muted/90 backdrop-blur-sm w-[250px] font-semibold text-sm border-b">
                Student
              </TableHead>
              {template.components.map((comp) => {
                if (comp.isRepeatable && comp.expectedCount) {
                  return Array.from({ length: comp.expectedCount }).map(
                    (_, idx) => (
                      <TableHead
                        key={`${comp.id}-${idx}`}
                        className="text-center min-w-[90px] border-l sticky top-0 z-20 bg-muted/90 backdrop-blur-sm font-semibold border-b"
                      >
                        <div className="text-sm">
                          {comp.name} {idx + 1}
                        </div>
                        <div className="text-[10px] opacity-60 font-normal mt-0.5">
                          Max: {comp.maxMarks}
                        </div>
                      </TableHead>
                    ),
                  );
                }

                return (
                  <TableHead
                    key={comp.id}
                    className="text-center min-w-[120px] border-l sticky top-0 z-20 bg-muted/90 backdrop-blur-sm font-semibold border-b"
                  >
                    <div className="text-sm">{comp.name}</div>
                    <div className="text-[10px] opacity-60 font-normal mt-0.5">
                      Max: {comp.maxMarks} ({comp.weight}%)
                    </div>
                  </TableHead>
                );
              })}
              <TableHead className="text-center w-[110px] font-bold sticky top-0 z-20 bg-muted/90 backdrop-blur-sm border-l border-b">
                Total (%)
              </TableHead>
              <TableHead className="text-center w-[110px] font-bold sticky top-0 z-20 bg-muted/90 backdrop-blur-sm border-l border-b">
                Grade
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const stats = getStudentStats(student.id);
              const studentScore = existingScores.find(
                (s) => s.studentId === student.id,
              );
              const isSubmitted =
                studentScore?.status && studentScore.status !== "DRAFT";

              return (
                <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border shadow-sm">
                        <AvatarImage src={student.user.image || undefined} />
                        <AvatarFallback className="font-medium bg-primary/10 text-primary">
                          {student.user.firstName[0]}
                          {student.user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">
                          {student.user.firstName} {student.user.lastName}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {student.admissionNumber || "No ID"}
                        </div>
                      </div>
                      {isSubmitted && (
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        >
                          {studentScore.status}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {template.components.map((comp) => {
                    const valueOrArray = marksData[student.id]?.[comp.id] ?? "";
                    const isReadOnly = isSystemLocked || isSubmitted;

                    if (comp.isRepeatable && comp.expectedCount) {
                      const arr = Array.isArray(valueOrArray)
                        ? valueOrArray
                        : Array(comp.expectedCount).fill("");

                      return Array.from({ length: comp.expectedCount }).map(
                        (_, idx) => {
                          const val = arr[idx] ?? "";
                          const isInvalid =
                            typeof val === "number" &&
                            (val > Number(comp.maxMarks) || val < 0);

                          return (
                            <TableCell
                              key={`${comp.id}-${idx}`}
                              className="p-2 border-l"
                            >
                              <div className="relative">
                                <Input
                                  type="number"
                                  min={0}
                                  max={Number(comp.maxMarks)}
                                  className={`text-center h-9 text-sm transition-colors ${isInvalid ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400" : ""} ${isReadOnly ? "bg-muted/50 opacity-80 cursor-not-allowed" : "bg-background"}`}
                                  value={val}
                                  disabled={isReadOnly}
                                  onChange={(e) =>
                                    handleMarkChange(
                                      student.id,
                                      comp.id,
                                      e.target.value,
                                      idx,
                                    )
                                  }
                                />
                              </div>
                            </TableCell>
                          );
                        },
                      );
                    }

                    const val =
                      typeof valueOrArray === "number" ||
                      typeof valueOrArray === "string"
                        ? valueOrArray
                        : "";
                    const isInvalid =
                      typeof val === "number" &&
                      (val > Number(comp.maxMarks) || val < 0);

                    return (
                      <TableCell key={comp.id} className="p-2 border-l">
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            max={Number(comp.maxMarks)}
                            className={`text-center h-9 text-sm transition-colors ${isInvalid ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400" : ""} ${isReadOnly ? "bg-muted/50 opacity-80 cursor-not-allowed" : "bg-background"}`}
                            value={val}
                            disabled={isReadOnly}
                            onChange={(e) =>
                              handleMarkChange(
                                student.id,
                                comp.id,
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold bg-muted/10 p-4 border-x text-sm">
                    {stats ? stats.total : "-"}
                  </TableCell>
                  <TableCell className="text-center p-4">
                    {stats ? (
                      <Badge
                        variant="outline"
                        className={`h-7 px-3 text-xs rounded-md ${stats.color}`}
                      >
                        {stats.grade}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      </div>

      {/* ── Import Preview / Confirmation Dialog ──────────────────────────── */}
      <Dialog open={!!importPreview} onOpenChange={(open) => !open && setImportPreview(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-500" />
              Review Imported Marks
            </DialogTitle>
            <DialogDescription>
              The file has been parsed successfully. Review the summary below before applying the marks to the gradebook.
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4 py-1">
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/40 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {importPreview.parsedStudents.filter((s) => marksData[s.studentId]).length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Students matched</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-center">
                  <p className={`text-2xl font-bold ${
                    importPreview.allWarnings.length > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {importPreview.allWarnings.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {importPreview.allWarnings.length === 0 ? "No issues" : "Warnings"}
                  </p>
                </div>
              </div>

              {/* Warnings list */}
              {importPreview.allWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-semibold">Warnings</span>
                  </div>
                  <ScrollArea className="max-h-40">
                    <ul className="space-y-1">
                      {importPreview.allWarnings.map((w, i) => (
                        <li key={i} className="text-xs text-amber-600/90 dark:text-amber-400/80 leading-relaxed">
                          • {w}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Cells with warnings were skipped. Existing marks for students not in the file will remain unchanged. Only cells with valid data will be overwritten.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setImportPreview(null)}
              className="gap-1.5"
            >
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button
              onClick={applyImportedMarks}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="h-4 w-4" /> Apply Marks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
