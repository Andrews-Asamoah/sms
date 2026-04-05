"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface PurgeStudentsButtonProps {
  schoolSlug: string;
}

export function PurgeStudentsButton({ schoolSlug }: PurgeStudentsButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const CONFIRMATION_PHRASE = "PURGE ALL STUDENTS";

  const handlePurge = async () => {
    if (confirmText !== CONFIRMATION_PHRASE) {
      toast.error("Confirmation text does not match");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/schools/${schoolSlug}/students/purge`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to purge students");
      }

      toast.success(data.message || "All students have been deleted");
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error("[PurgeStudentsButton] Error:", error);
      toast.error("Failed to delete students", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="lg" className="gap-2">
          <Trash2 className="h-5 w-5" />
          Delete All Students
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="h-6 w-6" />
            <AlertDialogTitle>Extreme Caution Required!</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4">
            <p className="font-bold text-foreground">
              This action is irreversible. You are about to permanently delete:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm border-l-2 border-destructive/20 pl-4 py-1">
              <li>All student records and profiles</li>
              <li>All associated login accounts & sessions</li>
              <li>All academic data (enrollments, scores, attendance)</li>
              <li>All financial data (bills, payments, balances)</li>
              <li>All guardian links and student-specific documents</li>
            </ul>
            <p className="text-destructive font-semibold">
              You should only do this if you intend to start the school's student database from scratch.
            </p>
            <div className="pt-2">
              <p className="text-sm font-medium mb-1.5 text-foreground">
                Type <span className="font-mono bg-muted px-1 rounded text-destructive">{CONFIRMATION_PHRASE}</span> below to confirm:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRMATION_PHRASE}
                className="border-destructive focus-visible:ring-destructive"
                autoFocus
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handlePurge}
            disabled={isDeleting || confirmText !== CONFIRMATION_PHRASE}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting Everything...
              </>
            ) : (
              "Yes, Delete All Data"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
