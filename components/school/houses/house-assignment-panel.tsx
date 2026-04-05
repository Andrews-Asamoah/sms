// components/school/houses/house-assignment-panel.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, UserPlus, Loader2, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { FieldGroup, FieldLabel } from "@/components/ui/field";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HouseOption {
  id: string;
  name: string;
  code: string;
  color: string | null;
}

interface ClassOption {
  id: string;
  name: string;
  academicYear: { name: string };
}

interface StudentOption {
  id: string;
  studentId: string;
  houseId: string | null;
  profile: { firstName: string; lastName: string };
}

interface HouseAssignmentPanelProps {
  schoolSlug: string;
  schoolId: string;
  unassignedCount: number;
  houses: HouseOption[];
  classes: ClassOption[];
}

// ─── Auto-Assign Dialog ───────────────────────────────────────────────────────

function AutoAssignDialog({
  schoolSlug,
  unassignedCount,
}: {
  schoolSlug: string;
  unassignedCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleAutoAssign() {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/houses/assign`,
        { method: "POST" },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to assign students");
      }

      const data = await res.json();
      toast.success("Students assigned", { description: data.message });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Assignment failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={unassignedCount === 0}
        className="gap-2"
      >
        <Shuffle className="h-4 w-4" />
        Auto-assign Unassigned
        {unassignedCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {unassignedCount}
          </Badge>
        )}
      </Button>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Auto-assign Students to Houses</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              This will automatically assign{" "}
              <strong>{unassignedCount} unassigned student{unassignedCount !== 1 ? "s" : ""}</strong>{" "}
              to houses using a balanced school-wide distribution.
            </span>
            <span className="block text-amber-600 dark:text-amber-400">
              Only students with a class assigned and no current house will be affected. Already-assigned students will not be changed.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleAutoAssign} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign {unassignedCount} Student{unassignedCount !== 1 ? "s" : ""}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Manual Assign Dialog ─────────────────────────────────────────────────────

function ManualAssignDialog({
  schoolSlug,
  houses,
  classes,
}: {
  schoolSlug: string;
  houses: HouseOption[];
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedHouseId, setSelectedHouseId] = useState<string>("");

  async function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    setSelectedStudentId("");
    setStudents([]);

    if (!classId) return;

    setIsFetchingStudents(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/students?classId=${classId}&status=ACTIVE&limit=200`,
      );
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : (data.students ?? []));
    } catch {
      toast.error("Could not load students for this class.");
    } finally {
      setIsFetchingStudents(false);
    }
  }

  async function handleAssign() {
    if (!selectedStudentId || !selectedHouseId) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/houses/assign`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: selectedStudentId,
            houseId: selectedHouseId,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to assign student");
      }

      const selectedStudent = students.find((s) => s.id === selectedStudentId);
      const selectedHouse = houses.find((h) => h.id === selectedHouseId);

      toast.success("Student assigned to house", {
        description: `${selectedStudent?.profile.firstName} ${selectedStudent?.profile.lastName} → ${selectedHouse?.name}`,
      });

      // Reset and refresh
      setOpen(false);
      setSelectedClassId("");
      setSelectedStudentId("");
      setSelectedHouseId("");
      setStudents([]);
      router.refresh();
    } catch (error) {
      toast.error("Assignment failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setSelectedClassId("");
      setSelectedStudentId("");
      setSelectedHouseId("");
      setStudents([]);
    }
  }

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const currentHouse = selectedStudent?.houseId
    ? houses.find((h) => h.id === selectedStudent.houseId)
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Assign Student to House
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Manually Assign Student to House
          </DialogTitle>
          <DialogDescription>
            Select a class, then choose the student and target house. You can
            reassign students who already have a house.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: Class */}
          <FieldGroup>
            <FieldLabel>1. Select Class</FieldLabel>
            <Select
              value={selectedClassId}
              onValueChange={handleClassChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a class…" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}{" "}
                    <span className="text-muted-foreground text-xs">
                      ({cls.academicYear.name})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>

          {/* Step 2: Student */}
          <FieldGroup>
            <FieldLabel>2. Select Student</FieldLabel>
            <Select
              value={selectedStudentId}
              onValueChange={setSelectedStudentId}
              disabled={!selectedClassId || isFetchingStudents || isLoading}
            >
              <SelectTrigger>
                {isFetchingStudents ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                  </span>
                ) : (
                  <SelectValue
                    placeholder={
                      selectedClassId
                        ? students.length === 0
                          ? "No students in this class"
                          : "Choose a student…"
                        : "Select a class first"
                    }
                  />
                )}
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span>
                        {s.profile.firstName} {s.profile.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {s.studentId}
                      </span>
                      {s.houseId && (
                        <Badge variant="outline" className="text-xs py-0">
                          {houses.find((h) => h.id === s.houseId)?.name ??
                            "Assigned"}
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Current house indicator */}
            {selectedStudent && (
              <p className="text-xs text-muted-foreground mt-1">
                Current house:{" "}
                {currentHouse ? (
                  <span className="font-medium text-foreground">
                    {currentHouse.name}
                  </span>
                ) : (
                  <span className="italic">None assigned</span>
                )}
              </p>
            )}
          </FieldGroup>

          {/* Step 3: House */}
          <FieldGroup>
            <FieldLabel>3. Select Target House</FieldLabel>
            <Select
              value={selectedHouseId}
              onValueChange={setSelectedHouseId}
              disabled={!selectedStudentId || isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a house…" />
              </SelectTrigger>
              <SelectContent>
                {houses.map((house) => (
                  <SelectItem key={house.id} value={house.id}>
                    <span className="flex items-center gap-2">
                      {house.color && (
                        <span
                          className="inline-block h-3 w-3 rounded-full border border-border/50 flex-shrink-0"
                          style={{ backgroundColor: house.color }}
                        />
                      )}
                      {house.name}
                      <span className="text-xs text-muted-foreground font-mono">
                        ({house.code})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedStudentId || !selectedHouseId || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedStudent && selectedStudent.houseId && selectedStudent.houseId !== selectedHouseId
              ? "Reassign to House"
              : "Assign to House"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function HouseAssignmentPanel({
  schoolSlug,
  schoolId: _schoolId,
  unassignedCount,
  houses,
  classes,
}: HouseAssignmentPanelProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <AutoAssignDialog
        schoolSlug={schoolSlug}
        unassignedCount={unassignedCount}
      />
      <ManualAssignDialog
        schoolSlug={schoolSlug}
        houses={houses}
        classes={classes}
      />
    </div>
  );
}
