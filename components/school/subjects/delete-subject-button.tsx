// components/school/subjects/delete-subject-button.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { deleteSubject } from "@/app/(school)/[schoolSlug]/admin/academics/subjects/actions";

interface DeleteSubjectButtonProps {
  subjectId: string;
  subjectName: string;
  schoolSlug: string;
  hasTeachers: boolean;
  hasClasses: boolean;
  hasAssessments: boolean;
  redirectOnDelete?: boolean;
  children?: React.ReactNode;
}

export function DeleteSubjectButton({
  subjectId,
  subjectName,
  schoolSlug,
  hasTeachers,
  hasClasses,
  hasAssessments,
  redirectOnDelete = false,
  children,
}: DeleteSubjectButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasDependencies = hasTeachers || hasClasses || hasAssessments;

  const handleDelete = () => {
    if (hasDependencies) {
      toast.error("Cannot delete subject with existing data");
      return;
    }

    startTransition(async () => {
      try {
        const result = await deleteSubject(schoolSlug, subjectId);

        if (result.success) {
          toast.success(result.message);
          setOpen(false);
          if (redirectOnDelete) {
            router.push(`/${schoolSlug}/admin/academic/subjects`);
          }
        } else {
          toast.error(result.error);
          if (result.details) {
            toast.error(result.details);
          }
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete subject",
        );
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant="destructive" size="sm">
            Delete Subject
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Subject</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <strong className="text-foreground">{subjectName}</strong>? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasDependencies && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>This subject cannot be deleted</strong> because it has:
              <ul className="mt-2 list-disc list-inside space-y-1">
                {hasTeachers && <li>Assigned teachers</li>}
                {hasClasses && <li>Class assignments</li>}
                {hasAssessments && <li>Assessment records</li>}
              </ul>
              <p className="mt-2">
                Please remove these dependencies before deleting the subject.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending || hasDependencies}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Subject
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
