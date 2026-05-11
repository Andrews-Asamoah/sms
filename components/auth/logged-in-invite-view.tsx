"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Building2, CheckCircle2, User, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { verifyInvitationStatus } from "@/app/auth/invite/[invitationId]/actions";

interface LoggedInInviteViewProps {
  session: {
    user: {
      name: string;
      email: string;
    };
  };
  invitation: {
    email: string;
    schoolName: string;
    inviterName: string;
    role: string | null;
    invitationId: string;
  };
}

export function LoggedInInviteView({ session, invitation }: LoggedInInviteViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const emailMatches = session.user.email.toLowerCase() === invitation.email.toLowerCase();

  async function handleAccept() {
    setIsSubmitting(true);
    setError("");

    try {
      const verification = await verifyInvitationStatus(invitation.invitationId);
      if (!verification.valid) {
        throw new Error(verification.error || "Invitation is no longer valid.");
      }

      // If they are logged in, we can directly accept the invitation using Better Auth API
      const response = await fetch(`/api/invitations/${invitation.invitationId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept invitation");
      }

      const result = await response.json();
      
      toast.success("Invitation accepted!", {
        description: `You have successfully joined ${invitation.schoolName}.`,
      });

      window.location.href = result.redirectUrl || "/wis/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation.");
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setIsSubmitting(true);
    try {
      await authClient.signOut();
      window.location.reload();
    } catch (err) {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Invitation Context Card */}
      <div className="rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm p-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0 bg-white dark:bg-slate-900">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-semibold text-[15px] text-slate-800 dark:text-slate-100 truncate">
                {invitation.schoolName}
              </p>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Invited by <span className="font-medium text-slate-600 dark:text-slate-300">{invitation.inviterName}</span>
            </p>
          </div>
          <CheckCircle2 className="h-6 w-6 text-blue-500 dark:text-blue-400 shrink-0" />
        </div>
      </div>

      {/* Action Card */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
        <div className="px-6 py-5 space-y-4">
          {error && (
            <Alert variant="destructive" className="py-3 px-4 text-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {session.user.email}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              disabled={isSubmitting}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Sign Out
            </Button>
          </div>

          {!emailMatches ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                This invitation was sent to <strong>{invitation.email}</strong>, but you are currently logged in as <strong>{session.user.email}</strong>. 
                Please sign out to accept the invitation with the correct account.
              </p>
              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={handleSignOut}
                disabled={isSubmitting}
              >
                Sign out & continue
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                You are ready to join {invitation.schoolName}.
              </p>
              <Button 
                className="w-full h-10" 
                onClick={handleAccept}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
