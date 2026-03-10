"use client";

import { useState, useMemo, useEffect } from "react";
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
  BadgeDollarSign,
  LayoutDashboard,
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
import { 
  saveMarksEntry,
  requestGradebookEdit 
} from "@/app/(school)/[schoolSlug]/teacher/classes/[classSlug]/gradebook/actions";

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
}: MarksEntrySheetProps & { forceReadOnly?: boolean }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Locking Logic
  const now = new Date();
  const deadline = template.deadline ? new Date(template.deadline) : null;
  const extDeadline = extension?.deadline ? new Date(extension.deadline) : null;
  const effectiveDeadline = extDeadline || deadline;
  const isDeadlinePassed = effectiveDeadline ? now > effectiveDeadline : false;
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

  const handleSave = async (status: "DRAFT" | "SUBMITTED" = "DRAFT") => {
    if (hasInvalidMarks) {
      toast.error("Please correct invalid marks before saving");
      return;
    }

    if (status === "SUBMITTED") {
      setIsSubmitting(true);
    } else {
      setIsSaving(true);
    }

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
        setIsSaving(false);
        setIsSubmitting(false);
        return;
      }

      const result = await saveMarksEntry({
        schoolSlug,
        classId,
        subjectId,
        termId,
        templateId: template.id,
        status,
        marks: payload,
      });

      if (result.success) {
        toast.success(
          status === "SUBMITTED"
            ? "Marks submitted for review"
            : "Marks saved successfully",
        );
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
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between sticky top-0 bg-background/95 backdrop-blur-md z-30 py-6 px-4 -mx-4 border-b shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Marks Entry Sheet
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">Template:</span>
              <Badge variant="secondary" className="font-semibold">
                {template.name}
              </Badge>
              {hasUnsavedChanges && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-10 px-4"
            onClick={() => handleSave("DRAFT")}
            disabled={
              isSaving ||
              isSubmitting ||
              !hasUnsavedChanges ||
              hasInvalidMarks ||
              isSystemLocked
            }
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Draft
          </Button>
          <Button
            className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleSave("SUBMITTED")}
            disabled={
              isSaving || isSubmitting || hasInvalidMarks || isSystemLocked
            }
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submit for Review
          </Button>
        </div>
      </div>

      {isSystemLocked && (
        <Card
          className={
            isPublished
              ? "border-blue-500/20 bg-blue-500/5"
              : "border-destructive/20 bg-destructive/5"
          }
        >
          <CardContent className="flex items-center gap-4 p-4">
            <Lock
              className={`h-5 w-5 ${isPublished ? "text-blue-600" : "text-red-600"}`}
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
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      Gradebook is currently locked (Approved/Reviewed).
                    </p>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80">
                      The administration has finalized these marks. You cannot make any further changes.
                    </p>
                  </div>
                  <Dialog open={isRequestingEdit} onOpenChange={setIsRequestingEdit}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-background border-red-500/20 text-red-600 hover:bg-red-500/10 h-8">
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

      {effectiveDeadline && !isSystemLocked && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <Clock className="h-4 w-4" />
          <span>
            Deadline: <b>{effectiveDeadline.toLocaleString()}</b>
          </span>
        </div>
      )}

      {reviewerRemarks && !isSystemLocked && (
        <Card className="border-amber-500/20 bg-amber-500/5 animate-pulse-subtle">
          <CardContent className="flex items-start gap-4 p-4">
            <div className="p-2 bg-amber-500/20 rounded-lg">
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

      <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[250px]">Student</TableHead>
              {template.components.map((comp) => {
                if (comp.isRepeatable && comp.expectedCount) {
                  return Array.from({ length: comp.expectedCount }).map(
                    (_, idx) => (
                      <TableHead
                        key={`${comp.id}-${idx}`}
                        className="text-center min-w-[70px] border-l"
                      >
                        <div className="text-sm font-semibold">
                          {comp.name} {idx + 1}
                        </div>
                        <div className="text-[10px] font-normal opacity-60">
                          Max: {comp.maxMarks}
                        </div>
                      </TableHead>
                    ),
                  );
                }

                return (
                  <TableHead
                    key={comp.id}
                    className="text-center min-w-[100px] border-l"
                  >
                    <div className="text-sm font-semibold">{comp.name}</div>
                    <div className="text-[10px] font-normal opacity-60">
                      Max: {comp.maxMarks} ({comp.weight}%)
                    </div>
                  </TableHead>
                );
              })}
              <TableHead className="text-center w-[100px] font-bold bg-muted/60">
                Total (%)
              </TableHead>
              <TableHead className="text-center w-[100px] font-bold bg-muted/60">
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
                <TableRow key={student.id} className="hover:bg-muted/30">
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={student.user.image || undefined} />
                        <AvatarFallback>
                          {student.user.firstName[0]}
                          {student.user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">
                          {student.user.firstName} {student.user.lastName}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
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
  );
}
