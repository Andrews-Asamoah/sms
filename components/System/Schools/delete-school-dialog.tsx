// components/dialogs/delete-school-dialog.tsx
"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DeleteSchoolDialogProps {
  schoolSlug: string;
  schoolName: string;
  schoolCode: string;
  hasData?: boolean;
}

export function DeleteSchoolDialog({
  schoolSlug,
  schoolName,
  schoolCode,
  hasData = false,
}: DeleteSchoolDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const isConfirmed = confirmText === schoolCode;

  async function handleDelete() {
    if (!isConfirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/schools/${schoolSlug}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete school");
      }

      toast.success("School deleted successfully", {
        description: `${schoolName} has been permanently deleted.`,
      });

      setOpen(false);
      router.push("/schools");
      router.refresh();
    } catch (error) {
      toast.error("Error deleting school", {
        description:
          error instanceof Error ? error.message : "Failed to delete school",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete School
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete School - Permanent Action
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              You are about to permanently delete <strong>{schoolName}</strong>.
              This action cannot be undone.
            </p>

            {hasData && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This school has existing students, teachers, or staff. You
                  must remove all users before deletion is allowed.
                </AlertDescription>
              </Alert>
            )}

            {!hasData && (
              <>
                <div className="bg-destructive/10 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    The following will be permanently deleted:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>School profile and settings</li>
                    <li>Organization and memberships</li>
                    <li>Subscription data</li>
                    <li>All associated records</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Type{" "}
                    <code className="bg-muted px-2 py-1 rounded text-destructive font-mono">
                      {schoolCode}
                    </code>{" "}
                    to confirm deletion:
                  </p>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={`Type ${schoolCode} to confirm`}
                    className="font-mono"
                    disabled={isDeleting}
                  />
                </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          {!hasData && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!isConfirmed || isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
