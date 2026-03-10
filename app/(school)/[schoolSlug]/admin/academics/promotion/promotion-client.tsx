"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

interface ClassType {
  id: string;
  name: string;
  department: {
    id: string;
    name: string;
    promotionPassMark: number | null;
  } | null;
}

interface StudentPromotionData {
  id: string;
  name: string;
  studentId: string;
  rawScore: number;
  hasPassed: boolean;
  status: "PENDING" | "PROMOTED" | "REPEATED";
}

interface PromotionClientProps {
  schoolSlug: string;
  classes: ClassType[];
  targetAcademicYearId: string;
  targetAcademicYearName: string;
}

export function PromotionClient({
  schoolSlug,
  classes,
  targetAcademicYearId,
  targetAcademicYearName,
}: PromotionClientProps) {
  const router = useRouter();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTargetClassId, setSelectedTargetClassId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [students, setStudents] = useState<StudentPromotionData[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [passMark, setPassMark] = useState<number | null>(null);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  async function fetchStudents(classId: string) {
    if (!classId) {
      setStudents([]);
      setPassMark(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/academics/promotion?classId=${classId}`
      );
      if (!response.ok) throw new Error("Failed to fetch students");

      const data = await response.json();
      setStudents(data.students);
      setPassMark(data.passMark);
      
      // Auto-select students who passed
      const passedIds = new Set<string>(
        data.students.filter((s: StudentPromotionData) => s.hasPassed).map((s: StudentPromotionData) => s.id)
      );
      setSelectedStudents(passedIds);
    } catch (error) {
      toast.error("Failed to load students for promotion");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleClassChange = (value: string) => {
    setSelectedClassId(value);
    setSelectedTargetClassId(""); // Reset target class
    fetchStudents(value);
  };

  const toggleStudent = (studentId: string) => {
    const next = new Set(selectedStudents);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    setSelectedStudents(next);
  };

  const toggleAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map((s) => s.id)));
    }
  };

  const activeClasses = classes.filter(c => c.id !== selectedClassId);

  async function executePromotion() {
    if (!selectedTargetClassId && selectedStudents.size > 0) {
      toast.error("Please select a target class for promoted students");
      return;
    }

    setIsPromoting(true);
    try {
      const response = await fetch(`/api/schools/${schoolSlug}/academics/promotion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceClassId: selectedClassId,
          targetClassId: selectedTargetClassId,
          targetAcademicYearId,
          promotedStudentIds: Array.from(selectedStudents),
          repeatedStudentIds: students
            .map((s) => s.id)
            .filter((id) => !selectedStudents.has(id)),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Promotion failed");
      }

      toast.success("Promotion Completed", {
        description: `Successfully processed ${students.length} students.`,
      });

      // Refresh list
      fetchStudents(selectedClassId);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Promotion failed");
    } finally {
      setIsPromoting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>End of Year Promotion</CardTitle>
          <CardDescription>
            Target Academic Year: <span className="font-medium text-foreground">{targetAcademicYearName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Class</label>
              <Select value={selectedClassId} onValueChange={handleClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class to evaluate" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.department?.name || "No Dept"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Class (For Promoted Students)</label>
              <Select value={selectedTargetClassId} onValueChange={setSelectedTargetClassId} disabled={!selectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination class" />
                </SelectTrigger>
                <SelectContent>
                  {activeClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedClass && passMark === null && !isLoading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Missing Pass Mark</AlertTitle>
              <AlertDescription>
                The department ({selectedClass.department?.name}) assigned to this class does not have a Promotion Pass Mark set.
                Please update the department settings first, or manually select students.
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : students.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{students.length} Students found</span>
                </div>
                {passMark !== null && (
                  <Badge variant="outline" className="gap-1">
                    Pass Mark: <span className="font-bold">{passMark}%</span>
                  </Badge>
                )}
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={selectedStudents.size === students.length && students.length > 0} 
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Raw Score</TableHead>
                      <TableHead>System Recommendation</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const isSelected = selectedStudents.has(student.id);
                      return (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Checkbox 
                              checked={isSelected} 
                              onCheckedChange={() => toggleStudent(student.id)} 
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.studentId}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={student.hasPassed ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                              {student.rawScore.toFixed(2)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            {student.hasPassed ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                Promote
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-red-500/10 text-destructive">
                                Repeat
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isSelected ? (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                To {activeClasses.find(c => c.id === selectedTargetClassId)?.name || 'Next Class'} 
                                <ArrowRight className="h-3 w-3" />
                              </span>
                            ) : (
                              <span className="text-sm text-amber-600">Will Repeat {selectedClass?.name}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={executePromotion} 
                  disabled={isPromoting || (!selectedTargetClassId && selectedStudents.size > 0)}
                  className="min-w-[200px]"
                >
                  {isPromoting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Execute Promotion ({selectedStudents.size} to promote, {students.length - selectedStudents.size} to repeat)
                </Button>
              </div>
            </div>
          ) : (
            selectedClassId && !isLoading && (
              <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/20">
                No active students found in this class.
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
