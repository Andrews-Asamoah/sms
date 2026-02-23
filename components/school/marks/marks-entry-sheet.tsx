"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveMarksEntry } from "@/app/(school)/[schoolSlug]/teacher/classes/[classId]/gradebook/actions";

import { MarksEntrySheetProps } from "@/app/(school)/[schoolSlug]/teacher/classes/[classId]/gradebook/types";

export function MarksEntrySheet({
  students,
  template,
  existingScores,
  schoolSlug,
  classId,
  subjectId,
  termId,
}: MarksEntrySheetProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
    if (!isNaN(numValue)) {
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
        // Weighted score calculation
        // (Marks Obtained / Max Marks) * Weight
        const weighted = (mark / Number(comp.maxMarks)) * Number(comp.weight);
        totalWeightedScore += weighted;
      }
      totalMaxWeight += Number(comp.weight); // Should sum to 100 usually
    });

    if (!hasEntries) return null;

    // Determine Grade
    // Assuming totalMaxWeight is 100, totalWeightedScore is the percentage.
    // If not, normalize: (totalWeightedScore / totalMaxWeight) * 100
    const percentage =
      totalMaxWeight > 0 ? (totalWeightedScore / totalMaxWeight) * 100 : 0;

    // Find generic grade from scales
    // Sort scales descending by minScore to find the highest match
    const gradeScale = template.gradingSystem.gradeScales
      .sort((a, b) => Number(b.minScore) - Number(a.minScore))
      .find((scale) => percentage >= Number(scale.minScore));

    return {
      total: percentage.toFixed(1),
      grade: gradeScale ? gradeScale.grade : "F", // Default F if no match?
      gradePoint: gradeScale ? Number(gradeScale.gradePoint) : 0,
      color:
        gradeScale && ["A", "B"].some((g) => gradeScale.grade.startsWith(g))
          ? "text-green-600"
          : gradeScale && gradeScale.grade.startsWith("C")
            ? "text-yellow-600"
            : gradeScale && gradeScale.grade.startsWith("F")
              ? "text-red-600"
              : "text-gray-600",
    };
  };

  // Save Function
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Transform state to API payload
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
        .filter((s) => s.componentScores.length > 0); // Only send students with marks

      const result = await saveMarksEntry({
        schoolSlug,
        classId,
        subjectId,
        termId,
        templateId: template.id,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Marks Entry</h2>
          {hasUnsavedChanges && (
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"
            >
              Unsaved Changes
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground hidden md:block">
            Template:{" "}
            <span className="font-medium text-foreground">{template.name}</span>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save All Marks
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[250px] min-w-[200px]">Student</TableHead>
              {template.components.map((comp) => (
                <TableHead key={comp.id} className="text-center min-w-[100px]">
                  <div>{comp.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    Max: {Number(comp.maxMarks)} ({Number(comp.weight)}%)
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center w-[100px] font-bold bg-muted/60">
                Total (%)
              </TableHead>
              <TableHead className="text-center w-[80px] font-bold bg-muted/60">
                Grade
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const stats = getStudentStats(student.id);
              return (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.user.image || undefined} />
                        <AvatarFallback>
                          {student.user.firstName[0]}
                          {student.user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div>
                          {student.user.firstName} {student.user.lastName}
                        </div>
                        {student.admissionNumber && (
                          <div className="text-xs text-muted-foreground">
                            {student.admissionNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  {template.components.map((comp) => {
                    const value = marksData[student.id]?.[comp.id] ?? "";
                    const isInvalid =
                      typeof value === "number" &&
                      value > Number(comp.maxMarks);

                    return (
                      <TableCell key={comp.id} className="p-2">
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            max={Number(comp.maxMarks)}
                            className={`text-center h-9 ${isInvalid ? "border-red-500 ring-1 ring-red-500" : ""}`}
                            value={value}
                            onChange={(e) =>
                              handleMarkChange(
                                student.id,
                                comp.id,
                                e.target.value,
                              )
                            }
                            step={0.5} // Allow half marks
                          />
                          {isInvalid && (
                            <div className="absolute -top-3 right-0 bg-red-100 text-red-600 text-[10px] px-1 rounded border border-red-200">
                              Max {Number(comp.maxMarks)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold bg-muted/30">
                    {stats ? stats.total : "-"}
                  </TableCell>
                  <TableCell
                    className={`text-center font-bold bg-muted/30 ${stats?.color || ""}`}
                  >
                    {stats ? (
                      <Badge
                        variant="outline"
                        className={
                          stats.color === "text-green-600"
                            ? "border-green-400 bg-green-50 text-green-700"
                            : ""
                        }
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

      {students.length === 0 && (
        <div className="p-8 text-center text-muted-foreground border rounded-md">
          No students found in this class.
        </div>
      )}
    </div>
  );
}
