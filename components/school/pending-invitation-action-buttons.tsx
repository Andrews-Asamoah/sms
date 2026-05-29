"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Send, Loader2 } from "lucide-react";
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
import {
  cancelInvitationAction,
  resendInvitationAction,
} from "@/app/(school)/[schoolSlug]/admin/invitation-actions";

interface PendingInvitationActionButtonsProps {
  schoolSlug: string;
  invitationId: string;
  email: string;
}

export function PendingInvitationActionButtons({
  schoolSlug,
  invitationId,
  email,
}: PendingInvitationActionButtonsProps) {
  const [isCancelPending, startCancelTransition] = useTransition();
  const [isResendPending, startResendTransition] = useTransition();
  const [openCancelDialog, setOpenCancelDialog] = useState(false);

  const handleCancel = () => {
    startCancelTransition(async () => {
      try {
        const result = await cancelInvitationAction(schoolSlug, invitationId);
        if (result.success) {
          toast.success("Invitation cancelled successfully");
          setOpenCancelDialog(false);
        } else {
          toast.error(result.error || "Failed to cancel invitation");
        }
      } catch (error) {
        toast.error("An unexpected error occurred");
      }
    });
  };

  const handleResend = () => {
    startResendTransition(async () => {
      try {
        const result = await resendInvitationAction(schoolSlug, invitationId);
        if (result.success) {
          toast.success("Invitation resent successfully");
        } else {
          toast.error(result.error || "Failed to resend invitation");
        }
      } catch (error) {
        toast.error("An unexpected error occurred");
      }
    });
  };

  const isAnyPending = isCancelPending || isResendPending;

  return (
    <div className="flex items-center gap-2">
      {/* Resend Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleResend}
        disabled={isAnyPending}
        className="text-primary hover:text-primary-foreground border-primary/20 hover:border-primary shrink-0 transition-all flex items-center gap-1"
      >
        {isResendPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        Resend
      </Button>

      {/* Cancel Dialog */}
      <AlertDialog open={openCancelDialog} onOpenChange={setOpenCancelDialog}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isAnyPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0 transition-all flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel the invitation for{" "}
              <strong className="text-foreground font-semibold">{email}</strong>. The invitation link will no longer work, and the pending record will be removed from the portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelPending}>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={isCancelPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isCancelPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
