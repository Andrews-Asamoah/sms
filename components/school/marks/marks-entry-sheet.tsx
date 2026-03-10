"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, AlertCircle, CheckCircle2, Lock, Clock, Send } from "lucide-react";
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
import { saveMarksEntry } from "@/app/(school)/[schoolSlug]/teacher/classes/[classSlug]/gradebook/actions";

import { MarksEntrySheetProps } from "@/app/(school)/[schoolSlug]/teacher/classes/[classSlug]/gradebook/types";

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
}: MarksEntrySheetProps) {
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
  const isSystemLocked = isPublished || isGlobalLocked || isDeadlinePassed;

  // State to hold marks: Record<studentId, Record<componentId, number | "">>
  const [marksData, setMarksData] = useState<
    Record<string, Record<string, number | "">>
  >({});

  // Initialize state from existing scores
  useEffect(() => {
    const initialData: Record<string, Record<string, number | "">> = {};

    students.forEach((student) => {
      initialData[student.id] = {};

      // Initialize with empty strings for all components
      template.components.forEach((comp) => {
        initialData[student.id][comp.id] = "";
      });

      // Fill in existing scores
      const studentScores = existingScores.find(
        (s) => s.studentId === student.id,
      );
      if (studentScores) {
        studentScores.componentScores.forEach((cs) => {
          initialData[student.id][cs.componentId] = Number(cs.marksObtained);
        });
      }
    });

    setMarksData(initialData);
  }, [students, existingScores, template]);

  // Handle Input Change
  const handleMarkChange = (
    studentId: string,
    componentId: string,
    value: string,
  ) => {
    if (isSystemLocked) return;

    // Allow empty string or valid number
    if (value === "") {
      setMarksData((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [componentId]: "",
        },
      }));
      setHasUnsavedChanges(true);
      return;
    }

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setMarksData((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [componentId]: numValue,
        },
      }));
      setHasUnsavedChanges(true);
    }
  };

  // Calculate Derived Stats (Total, Grade) for a student
  const getStudentStats = (studentId: string) => {
    const studentMarks = marksData[studentId] || {};
    let totalWeightedScore = 0;
    let totalMaxWeight = 0;
    let hasEntries = false;

    template.components.forEach((comp) => {
      const mark = studentMarks[comp.id];
      if (typeof mark === "number") {
        hasEntries = true;
        const weighted = (mark / Number(comp.maxMarks)) * Number(comp.weight);
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

    let colorClass = "text-gray-600 border-gray-200 bg-gray-50";
    if (!isNaN(gradeNum)) {
      if (gradeNum === 1)
        colorClass = "text-emerald-700 border-emerald-500 bg-emerald-50 font-bold";
      else if (gradeNum === 2)
        colorClass = "text-green-700 border-green-500 bg-green-50";
      else if (gradeNum <= 4)
        colorClass = "text-lime-700 border-lime-500 bg-lime-50";
      else if (gradeNum <= 6)
        colorClass = "text-yellow-700 border-yellow-500 bg-yellow-50";
      else if (gradeNum <= 8)
        colorClass = "text-orange-700 border-orange-500 bg-orange-50";
      else if (gradeNum >= 9)
        colorClass = "text-red-700 border-red-500 bg-red-50";
    } else {
      if (["A", "B"].some((g) => gradeStr.startsWith(g)))
        colorClass = "text-emerald-700 border-emerald-500 bg-emerald-50 font-bold";
      else if (gradeStr.startsWith("C"))
        colorClass = "text-yellow-700 border-yellow-500 bg-yellow-50";
      else colorClass = "text-red-700 border-red-500 bg-red-50";
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
            .filter(([_, mark]) => typeof mark === "number")
            .map(([componentId, mark]) => ({
              componentId,
              marks: mark as number,
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
        toast.success(status === "SUBMITTED" ? "Marks submitted for review" : "Marks saved successfully");
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
              <Badge variant="secondary" className="font-semibold text-primary/80">
                {template.name}
              </Badge>
              {hasUnsavedChanges && (
                <Badge variant="default" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">
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
            disabled={isSaving || isSubmitting || !hasUnsavedChanges || hasInvalidMarks || isSystemLocked}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Draft
          </Button>
          <Button
            className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleSave("SUBMITTED")}
            disabled={isSaving || isSubmitting || hasInvalidMarks || isSystemLocked}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit for Review
          </Button>
        </div>
      </div>

      {isSystemLocked && (
        <Card className={isPublished ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}>
          <CardContent className="flex items-center gap-4 p-4">
            <Lock className={`h-5 w-5 ${isPublished ? "text-blue-600" : "text-red-600"}`} />
            <div className="flex-1">
              {isPublished ? (
                <>
                  <p className="text-sm font-medium text-blue-900">Report cards have been published.</p>
                  <p className="text-xs text-blue-700 opacity-80">This gradebook is now read-only. Contact your administrator if changes are needed.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-red-900">Marks entry is currently locked.</p>
                  <p className="text-xs text-red-700 opacity-80">
                    {isGlobalLocked ? "Administrator has locked this assessment." : `Deadline (${effectiveDeadline?.toLocaleDateString()}) has passed.`}
                    {" "}Contact admin for an extension.
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
          <span>Deadline: <b>{effectiveDeadline.toLocaleString()}</b></span>
        </div>
      )}

      <div className="border rounded-md overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[250px]">Student</TableHead>
              {template.components.map((comp) => (
                <TableHead key={comp.id} className="text-center min-w-[100px]">
                  <div className="text-sm font-semibold">{comp.name}</div>
                  <div className="text-[10px] font-normal opacity-70">
                    Max: {comp.maxMarks} ({comp.weight}%)
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center w-[100px] font-bold bg-muted/60">Total (%)</TableHead>
              <TableHead className="text-center w-[100px] font-bold bg-muted/60">Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const stats = getStudentStats(student.id);
              const studentScore = existingScores.find(s => s.studentId === student.id);
              const isSubmitted = studentScore?.status && studentScore.status !== "DRAFT";

              return (
                <TableRow key={student.id} className="hover:bg-muted/30">
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={student.user.image || undefined} />
                        <AvatarFallback>{student.user.firstName[0]}{student.user.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">{student.user.firstName} {student.user.lastName}</div>
                        <div className="text-[10px] text-muted-foreground">{student.admissionNumber || "No ID"}</div>
                      </div>
                      {isSubmitted && (
                        <Badge variant="outline" className="ml-auto text-[10px] bg-blue-50 text-blue-700">
                          {studentScore.status}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {template.components.map((comp) => {
                    const value = marksData[student.id]?.[comp.id] ?? "";
                    const isInvalid = typeof value === "number" && (value > Number(comp.maxMarks) || value < 0);
                    const isReadOnly = isSystemLocked || isSubmitted;

                    return (
                      <TableCell key={comp.id} className="p-2">
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            max={Number(comp.maxMarks)}
                            className={`text-center h-9 text-sm ${isInvalid ? "border-red-500 bg-red-50" : ""} ${isReadOnly ? "bg-muted opacity-80 cursor-not-allowed" : ""}`}
                            value={value}
                            disabled={isReadOnly}
                            onChange={(e) => handleMarkChange(student.id, comp.id, e.target.value)}
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
                      <Badge variant="outline" className={`h-7 px-3 text-xs rounded-md ${stats.color}`}>
                        {stats.grade}
                      </Badge>
                    ) : "-"}
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
