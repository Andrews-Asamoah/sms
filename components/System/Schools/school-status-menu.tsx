"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  MoreVertical,
  PauseCircle,
  Archive,
  Play,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { updateSchoolStatus } from "@/app/(system)/schools/actions";

interface SchoolStatusMenuProps {
  schoolId: string;
  subdomain: string;
  currentStatus?: string | null;
  isSuperAdmin: boolean;
}

type Action = "suspend" | "archive" | "activate";

const actionLabels: Record<
  Action,
  { label: string; description: string; icon: React.ReactNode; variant: string }
> = {
  suspend: {
    label: "Suspend School",
    description:
      "This will suspend the school's access. Teachers, students, and staff will not be able to log in until reactivated.",
    icon: <PauseCircle className="h-4 w-4 mr-2 text-yellow-500" />,
    variant: "text-yellow-600",
  },
  archive: {
    label: "Archive School",
    description:
      "This will archive the school permanently. Archived schools are hidden from the active list. This action preserves all data.",
    icon: <Archive className="h-4 w-4 mr-2 text-muted-foreground" />,
    variant: "text-muted-foreground",
  },
  activate: {
    label: "Activate School",
    description:
      "This will reactivate the school and restore access for all users.",
    icon: <Play className="h-4 w-4 mr-2 text-green-500" />,
    variant: "text-green-600",
  },
};

export function SchoolStatusMenu({
  schoolId,
  subdomain,
  currentStatus,
  isSuperAdmin,
}: SchoolStatusMenuProps) {
  const [pending, setPending] = useState(false);
  const [confirmAction, setConfirmAction] = useState<Action | null>(null);

  if (!isSuperAdmin) return null;

  const isActive = currentStatus === "ACTIVE" || currentStatus === "TRIALING";
  const isSuspended = currentStatus === "PAST_DUE";
  const isArchived =
    currentStatus === "CANCELED" || currentStatus === "INCOMPLETE_EXPIRED";

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setPending(true);
    try {
      const result = await updateSchoolStatus(
        schoolId,
        subdomain,
        confirmAction,
      );
      if (result.success) {
        toast.success(result.message || "School status updated.");
      } else {
        toast.error(result.error || "Failed to update school status.");
      }
    } catch (e) {
      toast.error("An unexpected error occurred.");
    } finally {
      setPending(false);
      setConfirmAction(null);
    }
  };

  const selectedAction = confirmAction ? actionLabels[confirmAction] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>School Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!isActive && (
            <DropdownMenuItem
              className="cursor-pointer text-green-600 focus:text-green-600"
              onClick={() => setConfirmAction("activate")}
            >
              <Play className="h-4 w-4 mr-2" />
              Activate School
            </DropdownMenuItem>
          )}
          {isActive && (
            <DropdownMenuItem
              className="cursor-pointer text-yellow-600 focus:text-yellow-600"
              onClick={() => setConfirmAction("suspend")}
            >
              <PauseCircle className="h-4 w-4 mr-2" />
              Suspend School
            </DropdownMenuItem>
          )}
          {!isArchived && (
            <DropdownMenuItem
              className="cursor-pointer text-muted-foreground focus:text-muted-foreground"
              onClick={() => setConfirmAction("archive")}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive School
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedAction?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={pending}
              className={
                confirmAction === "suspend"
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : confirmAction === "archive"
                    ? "bg-muted hover:bg-muted/80 text-muted-foreground"
                    : "bg-green-600 hover:bg-green-700"
              }
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
