// components/school/subjects/remove-teacher-button.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { removeTeacherFromSubject } from "@/app/(school)/[schoolSlug]/admin/academics/subjects/actions";

interface RemoveTeacherButtonProps {
  subjectTeacherId: string;
  teacherName: string;
  subjectName: string;
  schoolSlug: string;
  children?: React.ReactNode;
}

export function RemoveTeacherButton({
  subjectTeacherId,
  teacherName,
  subjectName,
  schoolSlug,
  children,
}: RemoveTeacherButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      try {
        const result = await removeTeacherFromSubject(
          schoolSlug,
          subjectTeacherId,
        );

        if (result.success) {
          toast.success(result.message);
          setOpen(false);
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to remove teacher",
        );
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Teacher Assignment</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{teacherName}</strong> from{" "}
            <strong>{subjectName}</strong>? This will not delete the teacher,
            only remove their assignment to this subject.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemove} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
