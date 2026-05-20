"use client";

import { useState, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Users,
  AlertCircle,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  RefreshCcw,
  Zap,
  Receipt,
  Check,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PromotionType = "PROMOTED" | "REPEATED" | "GRADUATED" | "SKIPPED";

interface ClassType {
  id: string;
  name: string;
  isGraduatingClass: boolean;
  nextPromotionClassId: string | null;
  department: {
    id: string;
    name: string;
    promotionPassMark: number | null;
  } | null;
}

interface TargetClass {
  id: string;
  name: string;
  order: number | null;
}

interface StudentPromotionData {
  id: string;
  name: string;
  studentId: string;
  rawScore: number;
  totalRawScore: number;
  totalMaxScore: number;
  hasPassed: boolean;
  outstandingBalance: number;
  status: string;
}

interface StudentPromotion {
  studentId: string;
  type: PromotionType;
  targetClassId?: string;
  reason?: string;
}

interface PromotionClientProps {
  schoolSlug: string;
  classes: ClassType[];
  targetClasses: TargetClass[];
  targetAcademicYearId: string;
  targetAcademicYearName: string;
  currentAcademicYearId: string;
  targetFirstTermId: string | null;
}

const TYPE_LABELS: Record<PromotionType, string> = {
  PROMOTED: "Promote",
  REPEATED: "Repeat",
  GRADUATED: "Graduate",
  SKIPPED: "Skip to...",
};

const TYPE_ICONS: Record<PromotionType, React.ReactNode> = {
  PROMOTED: <ArrowRight className="h-3 w-3" />,
  REPEATED: <RefreshCcw className="h-3 w-3" />,
  GRADUATED: <GraduationCap className="h-3 w-3" />,
  SKIPPED: <Zap className="h-3 w-3" />,
};

const TYPE_COLORS: Record<PromotionType, string> = {
  PROMOTED: "bg-green-500/10 text-green-700 dark:text-green-400",
  REPEATED: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  GRADUATED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  SKIPPED: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
};

export function PromotionClient({
  schoolSlug,
  classes,
  targetClasses,
  targetAcademicYearId,
  targetAcademicYearName,
  currentAcademicYearId,
  targetFirstTermId,
}: PromotionClientProps) {
  const router = useRouter();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [defaultTargetClassId, setDefaultTargetClassId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [students, setStudents] = useState<StudentPromotionData[]>([]);
  const [passMark, setPassMark] = useState<number | null>(null);
  const [isGraduatingClass, setIsGraduatingClass] = useState(false);
  // Per-student assignments: studentId -> { type, targetClassId }
  const [assignments, setAssignments] = useState<Record<string, StudentPromotion>>({});

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const fetchStudents = useCallback(async (classId: string) => {
    if (!classId) {
      setStudents([]);
      setPassMark(null);
      setAssignments({});
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
      setIsGraduatingClass(!!data.isGraduatingClass);

      // Pre-populate default target class from class config
      const cls = classes.find((c) => c.id === classId);
      const defaultClass = cls?.nextPromotionClassId
        ? targetClasses.find((tc) => tc.id === cls.nextPromotionClassId)
        : targetClasses[0];
      const defaultDest = defaultClass?.id || targetClasses[0]?.id || "";
      setDefaultTargetClassId(defaultDest);

      // Auto-assign based on pass/fail and graduating class
      const initialAssignments: Record<string, StudentPromotion> = {};
      for (const s of data.students) {
        if (data.isGraduatingClass) {
          initialAssignments[s.id] = { studentId: s.id, type: "GRADUATED" };
        } else if (s.hasPassed) {
          initialAssignments[s.id] = {
            studentId: s.id,
            type: "PROMOTED",
            targetClassId: defaultDest,
          };
        } else {
          initialAssignments[s.id] = { studentId: s.id, type: "REPEATED" };
        }
      }
      setAssignments(initialAssignments);
    } catch (error) {
      toast.error("Failed to load students for promotion");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [schoolSlug, classes, targetClasses]);

  const handleClassChange = (value: string) => {
    setSelectedClassId(value);
    fetchStudents(value);
  };

  const setStudentType = (studentId: string, type: PromotionType) => {
    setAssignments((prev) => ({
      ...prev,
      [studentId]: {
        studentId,
        type,
        targetClassId:
          type === "PROMOTED"
            ? prev[studentId]?.targetClassId || defaultTargetClassId
            : type === "SKIPPED"
            ? prev[studentId]?.targetClassId || ""
            : undefined,
      },
    }));
  };

  const setStudentTarget = (studentId: string, targetClassId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], targetClassId },
    }));
  };

  const setStudentReason = (studentId: string, reason: string) => {
    setAssignments((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], reason },
    }));
  };

  // Update all PROMOTED students' targetClassId when default changes
  const handleDefaultTargetChange = (newTargetId: string) => {
    setDefaultTargetClassId(newTargetId);
    setAssignments((prev) => {
      const updated = { ...prev };
      for (const [id, a] of Object.entries(updated)) {
        if (a.type === "PROMOTED") {
          updated[id] = { ...a, targetClassId: newTargetId };
        }
      }
      return updated;
    });
  };

  async function executePromotion() {
    setIsPromoting(true);
    setShowConfirm(false);
    try {
      const promotions = Object.values(assignments);
      const response = await fetch(
        `/api/schools/${schoolSlug}/academics/promotion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceClassId: selectedClassId,
            targetAcademicYearId,
            currentAcademicYearId,
            targetFirstTermId,
            promotions,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Promotion failed");
      }

      const counts = getSummary();
      toast.success("Promotion Completed", {
        description: `${counts.promoted} promoted, ${counts.repeated} repeated, ${counts.graduated} graduated, ${counts.skipped} skipped.`,
      });

      setStudents([]);
      setAssignments({});
      setSelectedClassId("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Promotion failed"
      );
    } finally {
      setIsPromoting(false);
    }
  }

  function getSummary() {
    const vals = Object.values(assignments);
    return {
      promoted: vals.filter((v) => v.type === "PROMOTED").length,
      repeated: vals.filter((v) => v.type === "REPEATED").length,
      graduated: vals.filter((v) => v.type === "GRADUATED").length,
      skipped: vals.filter((v) => v.type === "SKIPPED").length,
      total: vals.length,
    };
  }

  const canExecute =
    students.length > 0 &&
    Object.values(assignments).every(
      (a) =>
        a.type === "REPEATED" ||
        a.type === "GRADUATED" ||
        (a.targetClassId && a.targetClassId.length > 0)
    );

  const summary = getSummary();

  const arrearsSummary = Object.values(assignments).reduce((sum, a) => {
    const student = students.find((s) => s.id === a.studentId);
    if (!student) return sum;
    if (a.type === "PROMOTED" || a.type === "SKIPPED" || a.type === "REPEATED") {
      return sum + (student.outstandingBalance || 0);
    }
    return sum;
  }, 0);

  const studentsWithArrearsCount = Object.values(assignments).filter((a) => {
    const student = students.find((s) => s.id === a.studentId);
    if (!student) return false;
    return (
      (a.type === "PROMOTED" || a.type === "SKIPPED" || a.type === "REPEATED") &&
      (student.outstandingBalance || 0) > 0
    );
  }).length;

  return (
    <div className="space-y-6">
      <Card className="border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.03] via-purple-500/[0.01] to-transparent shadow-[0_0_30px_rgba(99,102,241,0.06)] backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-indigo-500/10 bg-indigo-500/[0.02] p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                End of Year Promotion Evaluation
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Target Academic Year:{" "}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {targetAcademicYearName}
                </span>
              </CardDescription>
            </div>
          </div>
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
                      <span className="flex items-center gap-2">
                        {cls.name}
                        {cls.department?.name && (
                          <span className="text-muted-foreground text-xs">
                            ({cls.department.name})
                          </span>
                        )}
                        {cls.isGraduatingClass && (
                          <Badge
                            variant="secondary"
                            className="ml-1 text-xs px-1 py-0 bg-blue-500/10 text-blue-600"
                          >
                            Final
                          </Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClassId && !isGraduatingClass && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Default Target Class (for Promoted Students)
                </label>
                <Select
                  value={defaultTargetClassId}
                  onValueChange={handleDefaultTargetChange}
                  disabled={!selectedClassId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination class" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {selectedClass && passMark === null && !isLoading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Missing Pass Mark</AlertTitle>
              <AlertDescription>
                The department ({selectedClass.department?.name}) does not have
                a Promotion Pass Mark set. Students will not be auto-assessed.
                You can still manually assign promotion types.
              </AlertDescription>
            </Alert>
          )}

          {isGraduatingClass && selectedClassId && !isLoading && (
            <Alert>
              <GraduationCap className="h-4 w-4" />
              <AlertTitle>Graduating Class</AlertTitle>
              <AlertDescription>
                This is a graduating class. All students are pre-assigned{" "}
                <strong>Graduate</strong> status. You can override per-student
                if needed.
              </AlertDescription>
            </Alert>
          )}

          {selectedClassId && !isLoading && students.length > 0 && (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                Suspended students are automatically excluded from this list.
                Only active students are shown below.
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
                  <span className="font-medium">
                    {students.length} Students
                  </span>
                </div>
                {passMark !== null && (
                  <Badge variant="outline" className="gap-1">
                    Pass Mark:{" "}
                    <span className="font-bold">{passMark}%</span>
                  </Badge>
                )}
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Recommendation</TableHead>
                      <TableHead>Financial Status</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target Class / Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const a = assignments[student.id];
                      const currentType = a?.type || "PROMOTED";
                      const needsTarget =
                        currentType === "PROMOTED" ||
                        currentType === "SKIPPED";

                      return (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {student.studentId}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                student.hasPassed
                                  ? "text-green-600 dark:text-green-400 font-medium"
                                  : "text-destructive font-medium"
                              }
                            >
                              {student.rawScore.toFixed(1)}%
                            </span>
                            {student.totalMaxScore > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {student.totalRawScore.toFixed(0)}/
                                {student.totalMaxScore.toFixed(0)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.hasPassed ? (
                              <Badge
                                variant="secondary"
                                className="bg-green-500/10 text-green-600 dark:text-green-400"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Pass
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-red-500/10 text-destructive"
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Fail
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.outstandingBalance > 0 ? (
                              <Badge
                                variant="secondary"
                                className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold rounded-lg px-2.5 py-1 flex items-center gap-1.5 w-fit"
                              >
                                <Receipt className="h-3.5 w-3.5" />
                                GHS {student.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-medium rounded-lg px-2.5 py-1 flex items-center gap-1.5 w-fit"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Clear
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={currentType}
                              onValueChange={(v) =>
                                setStudentType(student.id, v as PromotionType)
                              }
                            >
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(
                                  [
                                    "PROMOTED",
                                    "REPEATED",
                                    "GRADUATED",
                                    "SKIPPED",
                                  ] as PromotionType[]
                                ).map((type) => (
                                  <SelectItem key={type} value={type}>
                                    <span className="flex items-center gap-1.5">
                                      {TYPE_ICONS[type]}
                                      {TYPE_LABELS[type]}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {needsTarget ? (
                                <Select
                                  value={a?.targetClassId || ""}
                                  onValueChange={(v) =>
                                    setStudentTarget(student.id, v)
                                  }
                                >
                                  <SelectTrigger className="w-full h-8 text-xs">
                                    <SelectValue placeholder="Select class" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {targetClasses.map((cls) => (
                                      <SelectItem key={cls.id} value={cls.id}>
                                        {cls.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[currentType]}`}
                                >
                                  {currentType === "REPEATED"
                                    ? selectedClass?.name || "Same class"
                                    : currentType === "GRADUATED"
                                    ? "Graduated ✓"
                                    : "—"}
                                </span>
                              )}
                              
                              <input
                                type="text"
                                placeholder="Add reason/note..."
                                className="w-full h-8 text-[11px] px-2 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                value={a?.reason || ""}
                                onChange={(e) => setStudentReason(student.id, e.target.value)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between pt-4 border-t flex-wrap gap-4">
                <div className="flex gap-3 text-sm text-muted-foreground flex-wrap items-center">
                  {summary.promoted > 0 && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                      <ArrowRight className="h-3.5 w-3.5" />
                      {summary.promoted} Promoted
                    </span>
                  )}
                  {summary.repeated > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      <RefreshCcw className="h-3.5 w-3.5" />
                      {summary.repeated} Repeated
                    </span>
                  )}
                  {summary.graduated > 0 && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {summary.graduated} Graduated
                    </span>
                  )}
                  {summary.skipped > 0 && (
                    <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                      <Zap className="h-3.5 w-3.5" />
                      {summary.skipped} Skipped
                    </span>
                  )}
                  {arrearsSummary > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg text-xs ml-2">
                      <Receipt className="h-3.5 w-3.5" />
                      Carry-Forward: GHS {arrearsSummary.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({studentsWithArrearsCount} Students)
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={isPromoting || !canExecute}
                  className="min-w-[200px] rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium shadow-md transition-all duration-300"
                >
                  {isPromoting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Execute Promotion
                </Button>
              </div>
            </div>
          ) : (
            selectedClassId &&
            !isLoading && (
              <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/20">
                No active students found in this class.
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md rounded-3xl border border-indigo-500/20 bg-card/90 backdrop-blur-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              Confirm Promotion Execution
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              You are about to process academic year-end promotions for{" "}
              <strong className="text-foreground">{summary.total} students</strong> from{" "}
              <strong className="text-foreground">{selectedClass?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2.5">
              {summary.promoted > 0 && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-green-500/10 p-3 bg-green-500/[0.02]">
                  <div className="p-1.5 rounded-lg bg-green-500/10 text-green-600">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">{summary.promoted}</p>
                    <p className="text-[11px] text-muted-foreground">Promoted</p>
                  </div>
                </div>
              )}
              {summary.repeated > 0 && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/10 p-3 bg-amber-500/[0.02]">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                    <RefreshCcw className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{summary.repeated}</p>
                    <p className="text-[11px] text-muted-foreground">Repeated</p>
                  </div>
                </div>
              )}
              {summary.graduated > 0 && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-blue-500/10 p-3 bg-blue-500/[0.02]">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{summary.graduated}</p>
                    <p className="text-[11px] text-muted-foreground">Graduated</p>
                  </div>
                </div>
              )}
              {summary.skipped > 0 && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-purple-500/10 p-3 bg-purple-500/[0.02]">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">{summary.skipped}</p>
                    <p className="text-[11px] text-muted-foreground">Skipped</p>
                  </div>
                </div>
              )}
            </div>

            {arrearsSummary > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                  <Receipt className="h-4 w-4 animate-pulse" />
                  <span>Financial Carry-Forward Integration</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A total of <strong className="text-foreground">GHS {arrearsSummary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> in outstanding balances for <strong className="text-foreground">{studentsWithArrearsCount} students</strong> will be safely carried forward as arrears invoices in the target academic period.
                </p>
                <div className="flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400/80 bg-amber-500/5 p-2 rounded-lg">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>Historical bills will be set to CANCELLED to maintain perfect accountant audit trails and avoid double billing.</span>
                </div>
              </div>
            )}

            <Alert className="border-indigo-500/10 bg-indigo-500/[0.02] rounded-2xl">
              <AlertCircle className="h-4 w-4 text-indigo-500" />
              <AlertDescription className="text-xs text-muted-foreground">
                Executing promotions creates active enrollments, registers student promotion records, and assigns teacher loads. This cannot be undone.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isPromoting}
              className="rounded-xl border border-indigo-500/10 hover:bg-indigo-500/5"
            >
              Cancel
            </Button>
            <Button
              onClick={executePromotion}
              disabled={isPromoting}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md"
            >
              {isPromoting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm &amp; Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
