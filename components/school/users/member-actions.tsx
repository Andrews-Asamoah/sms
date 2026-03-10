"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  UserMinus,
  Ban,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface MemberActionsProps {
  member: {
    userId: string;
    banned: boolean;
    role: string;
    user: {
      name: string;
      email: string;
    };
  };
  schoolSlug: string;
  currentUserId: string;
  userRole: string; // Current user's role in school
}

type ActionType = "remove" | "ban" | "unban" | null;

export function SchoolMemberActions({
  member,
  schoolSlug,
  currentUserId,
  userRole,
}: MemberActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>(null);

  const isSelf = member.userId === currentUserId;
  const isOwner = member.role === "owner";

  // Admins cannot ban owners or themselves
  const canPerformActions = !isSelf && (userRole === "owner" || !isOwner);

  const handleAction = async () => {
    if (!actionType) return;

    setIsLoading(true);
    try {
      let endpoint = "";
      let successMessage = "";

      switch (actionType) {
        case "remove":
          endpoint = `/api/schools/${schoolSlug}/members/${member.userId}/remove`;
          successMessage = `${member.user.name} has been removed from this school`;
          break;
        case "ban":
          endpoint = `/api/schools/${schoolSlug}/members/${member.userId}/ban`;
          successMessage = `${member.user.name} has been suspended from this school`;
          break;
        case "unban":
          endpoint = `/api/schools/${schoolSlug}/members/${member.userId}/unban`;
          successMessage = `${member.user.name} has been unsuspended`;
          break;
      }

      const response = await fetch(endpoint, {
        method: "POST", // Both ban and unban use POST. Remove uses DELETE/POST? Usually POST for actions.
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Action failed");
      }

      toast.success("Success", {
        description: successMessage,
      });

      router.refresh();
    } catch (error) {
      toast.error("Action failed", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
      setDialogOpen(false);
      setActionType(null);
    }
  };

  const openDialog = (type: ActionType) => {
    setActionType(type);
    setDialogOpen(true);
  };

  const getDialogContent = () => {
    switch (actionType) {
      case "remove":
        return {
          title: "Remove Member",
          description: `Are you sure you want to remove ${member.user.name} from this school? They will lose access to all school resources.`,
          confirmText: "Remove Member",
          variant: "destructive" as const,
        };
      case "ban":
        return {
          title: "Suspend Member",
          description: `Are you sure you want to suspend ${member.user.name}? They will be unable to log in to this school until unsuspended.`,
          confirmText: "Suspend Member",
          variant: "destructive" as const,
        };
      case "unban":
        return {
          title: "Unsuspend Member",
          description: `Are you sure you want to unsuspend ${member.user.name}? They will regain access to the school.`,
          confirmText: "Unsuspend Member",
          variant: "default" as const,
        };
      default:
        return {
          title: "",
          description: "",
          confirmText: "",
          variant: "default" as const,
        };
    }
  };

  if (!canPerformActions) return null;

  const dialogContent = getDialogContent();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {member.banned ? (
            <DropdownMenuItem
              onClick={() => openDialog("unban")}
              className="text-green-600"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Unsuspend
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => openDialog("ban")}
              className="text-orange-600"
            >
              <Ban className="mr-2 h-4 w-4" />
              Suspend
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => openDialog("remove")}
            className="text-destructive"
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Remove from School
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {dialogContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isLoading}
              className={
                dialogContent.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {isLoading ? "Processing..." : dialogContent.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
