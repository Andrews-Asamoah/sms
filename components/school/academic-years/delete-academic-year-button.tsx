// components/admin/academic-years/delete-academic-year-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

interface DeleteAcademicYearButtonProps {
  yearId: string;
  yearName: string;
  schoolSlug: string;
  hasClasses: boolean;
  hasEnrollments: boolean;
  isGlobal: boolean;
}

export function DeleteAcademicYearButton({
  yearId,
  yearName,
  schoolSlug,
  hasClasses,
  hasEnrollments,
  isGlobal,
}: DeleteAcademicYearButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const canDelete = !hasClasses && !hasEnrollments && !isGlobal;

  async function handleDelete() {
    if (!canDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/academic-years/${yearId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete academic year");
      }

      toast.success("Academic year deleted", {
        description: "The academic year has been deleted successfully.",
      });

      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/20 text-destructive hover:bg-destructive/10"
          disabled={!canDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-0 bg-card/95 backdrop-blur-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {canDelete ? (
              <>
                This action cannot be undone. This will permanently delete the
                academic year <span className="font-semibold">{yearName}</span>{" "}
                and all associated data.
              </>
            ) : (
              <>
                Cannot delete this academic year because:
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {isGlobal && (
                    <li>
                      It is currently set as the global default academic year
                    </li>
                  )}
                  {hasClasses && <li>It has associated classes</li>}
                  {hasEnrollments && <li>It has student enrollments</li>}
                </ul>
                <p className="mt-2">
                  Please remove all associations or change global settings
                  before deleting.
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          {canDelete && (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
