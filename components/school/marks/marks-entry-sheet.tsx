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

    const gradeStr = gradeScale ? gradeScale.grade : "9"; // Default 9 if no match for Ghana schools
    const gradeNum = parseInt(gradeStr);

    // Color mapping for Ghana Basic Schools (1-9 scale)
    // 1 (Highest) -> Green
    // 9 (Lowest) -> Red
    let colorClass = "text-gray-600 border-gray-200 bg-gray-50";
    if (!isNaN(gradeNum)) {
      if (gradeNum === 1)
        colorClass =
          "text-emerald-700 border-emerald-500 bg-emerald-50 font-bold";
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
      // Fallback for letter grades if any
      if (["A", "B"].some((g) => gradeStr.startsWith(g)))
        colorClass =
          "text-emerald-700 border-emerald-500 bg-emerald-50 font-bold";
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

  // Check if any mark is invalid
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

  // Save Function
  const handleSave = async () => {
    if (hasInvalidMarks) {
      toast.error("Please correct invalid marks before saving");
      return;
    }
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

      if (payload.length === 0) {
        toast.error("No marks entered to save");
        setIsSaving(false);
        return;
      }

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
              <Badge
                variant="secondary"
                className="font-semibold text-primary/80"
              >
                {template.name}
              </Badge>
              {hasUnsavedChanges && (
                <Badge
                  variant="default"
                  className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 shadow-none animate-pulse"
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
            size="lg"
            className="h-12 px-8 text-base shadow-md transition-all active:scale-95"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges || hasInvalidMarks}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
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
                <TableRow
                  key={student.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border shadow-sm">
                        <AvatarImage src={student.user.image || undefined} />
                        <AvatarFallback className="bg-primary/5 text-primary">
                          {student.user.firstName[0]}
                          {student.user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-foreground">
                          {student.user.firstName} {student.user.lastName}
                        </div>
                        {student.admissionNumber && (
                          <div className="text-xs text-muted-foreground font-mono">
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
                      (value > Number(comp.maxMarks) || value < 0);

                    return (
                      <TableCell key={comp.id} className="p-3">
                        <div className="relative group/input">
                          <Input
                            type="number"
                            min={0}
                            max={Number(comp.maxMarks)}
                            className={`text-center h-10 font-medium transition-all focus:ring-primary/20 ${isInvalid ? "border-red-500 bg-red-50 ring-1 ring-red-500" : "border-muted-foreground/20 hover:border-primary/50"}`}
                            value={value}
                            onChange={(e) =>
                              handleMarkChange(
                                student.id,
                                comp.id,
                                e.target.value,
                              )
                            }
                            step={0.5}
                          />
                          {isInvalid && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-1.5 rounded-full border border-red-700 shadow-sm z-10 whitespace-nowrap">
                              {typeof value === "number" && value < 0
                                ? "Min 0"
                                : `Max ${Number(comp.maxMarks)}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold bg-muted/20 p-4 border-x">
                    <span className="text-lg">{stats ? stats.total : "-"}</span>
                  </TableCell>
                  <TableCell className="text-center p-4 bg-muted/20">
                    {stats ? (
                      <Badge
                        variant="outline"
                        className={`h-9 px-4 text-base rounded-md shadow-sm transition-all ${stats.color}`}
                      >
                        {stats.grade}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
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
