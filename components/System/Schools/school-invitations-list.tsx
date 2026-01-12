// ============================================================
// components/schools/school-invitations-list.tsx
// Display pending invitations
// ============================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, X, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Invitation {
  id: string;
  email: string;
  role: string | null;
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
  isSuperAdmin: boolean;
}

export function SchoolInvitationsList({
  invitations,
  schoolId,
  isSuperAdmin,
}: SchoolInvitationsListProps) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) {
      return;
    }

    setCancellingId(invitationId);
    try {
      const response = await fetch(
        `/api/schools/${schoolId}/invite-admin?invitationId=${invitationId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to cancel invitation");
      }

      toast.success("Invitation cancelled");
      router.refresh();
    } catch (error) {
      toast.error("Failed to cancel invitation");
    } finally {
      setCancellingId(null);
    }
  };

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card className="backdrop-blur-xl bg-background/60 border-yellow-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <Mail className="h-5 w-5" />
          Pending Invitations
          <Badge variant="outline" className="ml-auto">
            {invitations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invitations.map((invitation) => {
            const expiresIn = Math.ceil(
              (new Date(invitation.expiresAt).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            );
            const isExpired = expiresIn <= 0;

            return (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {invitation.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {isExpired
                        ? "Expired"
                        : `Expires in ${expiresIn} day${
                            expiresIn !== 1 ? "s" : ""
                          }`}
                    </span>
                    {invitation.role && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          {invitation.role}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {isSuperAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelInvitation(invitation.id)}
                    disabled={cancellingId === invitation.id}
                  >
                    {cancellingId === invitation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
