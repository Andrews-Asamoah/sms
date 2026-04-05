"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldBan, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BanUserButtonProps {
  schoolSlug: string;
  userId: string;
  isBanned: boolean;
  userName: string;
  trigger?: React.ReactNode;
}

export function BanUserButton({
  schoolSlug,
  userId,
  isBanned,
  userName,
  trigger,
}: BanUserButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [localIsBanned, setLocalIsBanned] = useState(isBanned);

  useEffect(() => {
    setLocalIsBanned(isBanned);
  }, [isBanned]);

  async function handleToggleBan(ban: boolean) {
    setIsLoading(true);
    try {
      const endpoint = ban 
        ? `/api/schools/${schoolSlug}/members/${userId}/ban`
        : `/api/schools/${schoolSlug}/members/${userId}/unban`;
      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() || undefined }),
        }
      );


      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Operation failed");
      }

      toast.success(ban ? "User Banned" : "User Unbanned", {
        description: ban
          ? `${userName} has been banned and can no longer log in.`
          : `${userName} has been unbanned and can now log in again.`,
      });

      setLocalIsBanned(ban);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  if (localIsBanned) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Unban User
            </Button>
          )}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unban {userName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore their access to the system. They will be able
              to log in again immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleToggleBan(false)}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Unban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/5">
            <ShieldBan className="mr-2 h-4 w-4" />
            Ban User
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ban {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will immediately revoke their access to the system. They will
            not be able to log in until unbanned.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="reason">Reason (required)</Label>
          <Textarea
            id="reason"
            placeholder="Explain the reason for this ban. This will be shown to the user."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => handleToggleBan(true)}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, Ban User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
