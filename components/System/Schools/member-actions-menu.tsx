// components/System/Schools/member-actions-menu.tsx
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
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface MemberActionsMenuProps {
  member: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      banned?: boolean;
    };
  };
  schoolId: string;
  currentUserId: string;
  isSuperAdmin: boolean;
}

type ActionType = "remove" | "ban" | "unban" | "delete" | null;

export function MemberActionsMenu({
  member,
  schoolId,
  currentUserId,
  isSuperAdmin,
}: MemberActionsMenuProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>(null);

  // Can't perform actions on yourself
  const isSelf = member.user.id === currentUserId;

  // Can't remove super admins unless you're a super admin
  const canPerformActions =
    !isSelf && (isSuperAdmin || member.user.role !== "superAdmin");

  const handleAction = async () => {
    if (!actionType) return;

    setIsLoading(true);
    try {
      let endpoint = "";
      let method = "POST";
      let successMessage = "";

      switch (actionType) {
        case "remove":
          endpoint = `/api/schools/${schoolId}/members/${member.user.id}/remove`;
          method = "DELETE";
          successMessage = `${member.user.name} has been removed from this school`;
          break;
        case "ban":
          endpoint = `/api/schools/${schoolId}/members/${member.user.id}/ban`;
          successMessage = `${member.user.name} has been banned`;
          break;
        case "unban":
          endpoint = `/api/schools/${schoolId}/members/${member.user.id}/unban`;
          successMessage = `${member.user.name} has been unbanned`;
          break;
        case "delete":
          endpoint = `/api/schools/${schoolId}/members/${member.user.id}/delete`;
          method = "DELETE";
          successMessage = `${member.user.name}'s account has been deleted`;
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
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
          description: `Are you sure you want to remove ${member.user.name} from this school? They will lose access to all school resources. Their account will remain active in the system.`,
          confirmText: "Remove Member",
          variant: "destructive" as const,
        };
      case "ban":
        return {
          title: "Ban User",
          description: `Are you sure you want to ban ${member.user.name}? They will be unable to access any part of the system. This action can be reversed later.`,
          confirmText: "Ban User",
          variant: "destructive" as const,
        };
      case "unban":
        return {
          title: "Unban User",
          description: `Are you sure you want to unban ${member.user.name}? They will regain access to their account and assigned resources.`,
          confirmText: "Unban User",
          variant: "default" as const,
        };
      case "delete":
        return {
          title: "Delete Account",
          description: `Are you sure you want to permanently delete ${member.user.name}'s account? This action cannot be undone and will remove all their data from the system.`,
          confirmText: "Delete Account",
          variant: "destructive" as const,
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

  const dialogContent = getDialogContent();

  if (!canPerformActions) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Manage Member</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Remove from school */}
          <DropdownMenuItem
            onClick={() => openDialog("remove")}
            className="text-orange-600 focus:text-orange-600"
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Remove from School
          </DropdownMenuItem>

          {/* Ban/Unban user (SuperAdmin only) */}
          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                System Actions
              </DropdownMenuLabel>
              {member.user.banned ? (
                <DropdownMenuItem
                  onClick={() => openDialog("unban")}
                  className="text-green-600 focus:text-green-600"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Unban User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => openDialog("ban")}
                  className="text-orange-600 focus:text-orange-600"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Ban User
                </DropdownMenuItem>
              )}

              {/* Delete account (SuperAdmin only - most dangerous) */}
              <DropdownMenuItem
                onClick={() => openDialog("delete")}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
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
