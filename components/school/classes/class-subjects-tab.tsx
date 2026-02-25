"use client";

import { useState, useTransition } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  UserPlus,
  Check,
  ChevronRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  assignSubjectsToClass,
  updateClassSubjectTeacher,
  syncSubjectTeacherAcrossSections,
  bulkAssignSubjectsToLevel,
} from "@/app/(school)/[schoolSlug]/admin/classes/actions";

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Teacher {
  id: string;
  profile: {
    firstName: string;
    lastName: string;
  };
}

interface ClassSubject {
  subjectId: string;
  teacherId: string | null;
  subject: Subject;
  teacher: Teacher | null;
}

interface ClassSubjectsTabProps {
  schoolSlug: string;
  classId: string;
  level: string;
  academicYearId: string;
  currentSubjects: ClassSubject[];
  allSubjects: Subject[];
  schoolTeachers: Teacher[];
}

export function ClassSubjectsTab({
  schoolSlug,
  classId,
  level,
  academicYearId,
  currentSubjects,
  allSubjects,
  schoolTeachers,
}: ClassSubjectsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isAddingSubjects, setIsAddingSubjects] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(
    currentSubjects.map((s) => s.subjectId),
  );

  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId],
    );
  };

  const handleSaveSubjects = () => {
    startTransition(async () => {
      const result = await assignSubjectsToClass(
        schoolSlug,
        classId,
        selectedSubjectIds,
      );

      if (result.success) {
        toast.success("Subjects updated");
        setIsAddingSubjects(false);
      } else {
        toast.error(result.error || "Failed to update subjects");
      }
    });
  };

  const handleApplyToLevel = () => {
    startTransition(async () => {
      const result = await bulkAssignSubjectsToLevel(
        schoolSlug,
        level,
        academicYearId,
        selectedSubjectIds,
      );

      if (result.success) {
        toast.success(`Copied subjects to all ${level} sections`);
        setIsAddingSubjects(false);
      } else {
        toast.error(result.error || "Failed to perform bulk assignment");
      }
    });
  };

  const handleUpdateTeacher = (subjectId: string, teacherId: string) => {
    const finalTeacherId = teacherId === "none" ? null : teacherId;

    startTransition(async () => {
      const result = await updateClassSubjectTeacher(
        schoolSlug,
        classId,
        subjectId,
        finalTeacherId,
      );

      if (result.success) {
        toast.success("Teacher assigned to subject");
      } else {
        toast.error(result.error || "Failed to assign teacher");
      }
    });
  };

  const handleSyncTeacher = (subjectId: string, teacherId: string | null) => {
    setIsSyncing(subjectId);
    startTransition(async () => {
      const result = await syncSubjectTeacherAcrossSections(
        schoolSlug,
        level,
        academicYearId,
        subjectId,
        teacherId,
      );

      if (result.success) {
        toast.success(`Teacher synced across all ${level} sections`);
      } else {
        toast.error(result.error || "Failed to sync teacher");
      }
      setIsSyncing(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Assigned Subjects</h2>
          <p className="text-sm text-muted-foreground">
            Manage the curriculum and teacher assignments for this class
          </p>
        </div>

        <Dialog open={isAddingSubjects} onOpenChange={setIsAddingSubjects}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Manage Subjects
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add / Remove Subjects</DialogTitle>
              <DialogDescription>
                Select the subjects that should be taught in this class.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[300px] pr-4 border rounded-md p-4">
              <div className="space-y-4">
                {allSubjects.map((subject) => (
                  <div key={subject.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`subject-${subject.id}`}
                      checked={selectedSubjectIds.includes(subject.id)}
                      onCheckedChange={() => handleToggleSubject(subject.id)}
                    />
                    <label
                      htmlFor={`subject-${subject.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {subject.name} ({subject.code})
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="bg-muted/50 p-3 rounded-md flex items-start gap-2 text-xs">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <p>
                <strong>Tip:</strong> Use "Apply to all {level} sections" to
                match subjects across all subdivisons of this grade.
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleApplyToLevel}
                disabled={isPending}
              >
                Apply to all {level} sections
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsAddingSubjects(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveSubjects} disabled={isPending}>
                  {isPending ? "Saving..." : "Save for this class"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {currentSubjects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <BookOpen className="h-10 w-10 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No subjects assigned yet</p>
              <Button variant="link" onClick={() => setIsAddingSubjects(true)}>
                Get started by adding subjects
              </Button>
            </CardContent>
          </Card>
        ) : (
          currentSubjects.map((cs) => (
            <Card key={cs.subjectId} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{cs.subject.name}</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {cs.subject.code}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex-1 sm:w-[250px]">
                    <Select
                      value={cs.teacherId || "none"}
                      onValueChange={(val) =>
                        handleUpdateTeacher(cs.subjectId, val)
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-9">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue placeholder="Assign teacher" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not assigned</SelectItem>
                        {schoolTeachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.profile.firstName} {t.profile.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-primary transition-colors"
                    title={`Sync this teacher to all other ${level} sections`}
                    onClick={() =>
                      handleSyncTeacher(cs.subjectId, cs.teacherId)
                    }
                    disabled={isPending || isSyncing === cs.subjectId}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isSyncing === cs.subjectId ? "animate-spin text-primary" : ""}`}
                    />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
