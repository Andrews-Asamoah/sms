// components/System/Schools/school-invitations-list.tsx - UPDATED VERSION
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Mail, Clock, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  inviter: {
    name: string;
    email: string;
  };
}

interface SchoolInvitationsListProps {
  invitations: Invitation[];
  schoolId: string;
  schoolSlug: string; // ✅ Added for API calls
  isSuperAdmin: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SchoolInvitationsList({
  invitations,
  schoolId,
  schoolSlug, // ✅ Now accepts schoolSlug
  isSuperAdmin,
}: SchoolInvitationsListProps) {
  const router = useRouter();
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const handleCancelInvitation = async (invitationId: string) => {
    setCancelingId(invitationId);

    try {
      // Use schoolSlug in API call (subdomain-based route)
      const response = await fetch(
        `/api/schools/${schoolSlug}/invitations/${invitationId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel invitation");
      }

      toast.success("Invitation cancelled", {
        description: "The invitation has been cancelled successfully.",
      });

      router.refresh();
    } catch (error) {
      toast.error("Failed to cancel invitation", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setCancelingId(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "owner":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "member":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const isExpired = (expiresAt: Date) => {
    return new Date(expiresAt) < new Date();
  };

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          {invitations.length}{" "}
          {invitations.length === 1 ? "invitation" : "invitations"} waiting to
          be accepted
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invitations.map((invitation) => {
            const expired = isExpired(invitation.expiresAt);

            return (
              <div
                key={invitation.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  expired
                    ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                    : "bg-card"
                }`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{invitation.email}</p>
                    <Badge
                      className={getRoleBadgeColor(invitation.role)}
                      variant="secondary"
                    >
                      {invitation.role}
                    </Badge>
                    {expired && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Expired
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Invited by {invitation.inviter.name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(invitation.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {!expired && (
                      <span className="text-xs">
                        Expires{" "}
                        {formatDistanceToNow(new Date(invitation.expiresAt), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {isSuperAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={cancelingId === invitation.id}
                        className="ml-4"
                      >
                        {cancelingId === invitation.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel the invitation to{" "}
                          <strong>{invitation.email}</strong>? They will no
                          longer be able to accept this invitation.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Cancel Invitation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
