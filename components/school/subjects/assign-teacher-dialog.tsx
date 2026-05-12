// components/school/subjects/assign-teacher-dialog.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { assignTeacherToSubject } from "@/app/(school)/[schoolSlug]/admin/academics/subjects/actions";
import type { Teacher, UserProfile } from "@prisma/client";

type TeacherWithProfile = Teacher & {
  profile: UserProfile;
};

interface AssignTeacherDialogProps {
  subjectId: string;
  subjectName: string;
  schoolSlug: string;
  availableTeachers: TeacherWithProfile[];
  children?: React.ReactNode;
}

export function AssignTeacherDialog({
  subjectId,
  subjectName,
  schoolSlug,
  availableTeachers,
  children,
}: AssignTeacherDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleAssign = () => {
    if (!selectedTeacher) {
      toast.error("Please select a teacher");
      return;
    }

    startTransition(async () => {
      try {
        const result = await assignTeacherToSubject(
          schoolSlug,
          subjectId,
          selectedTeacher,
        );

        if (result.success) {
          toast.success(result.message);
          setOpen(false);
          setSelectedTeacher("");
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to assign teacher",
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button>Assign Teacher</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Teacher to {subjectName}</DialogTitle>
          <DialogDescription>
            Select a teacher to assign to this subject. Teachers can be assigned
            to multiple subjects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <FieldGroup>
            <FieldLabel htmlFor="teacher">Select Teacher</FieldLabel>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger id="teacher">
                <SelectValue placeholder="Choose a teacher" />
              </SelectTrigger>
              <SelectContent>
                {availableTeachers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No available teachers
                  </div>
                ) : (
                  availableTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.profile.firstName} {teacher.profile.lastName} (
                      {teacher.teacherId})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </FieldGroup>

          {availableTeachers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              All teachers are already assigned to this subject or there are no
              active teachers available.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isPending || !selectedTeacher}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Teacher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
