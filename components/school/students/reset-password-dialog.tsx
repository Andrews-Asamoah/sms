"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ResetPasswordDialogProps {
  studentId: string;
  studentName: string;
  schoolSlug: string;
}

export function ResetPasswordDialog({
  studentId,
  studentName,
  schoolSlug,
}: ResetPasswordDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const router = useRouter();

  const handleResetPassword = async () => {
    setIsLoading(true);
    setNewPassword(null);
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/students/${studentId}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reset password");
      }

      const data = await response.json();
      setNewPassword(data.newPassword);
      toast.success("Password reset successfully");
    } catch (error) {
      console.error("[Reset Password] Error:", error);
      toast.error("Failed to reset password", {
        description: error instanceof Error ? error.message : "Try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      toast.success("Password copied to clipboard");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setNewPassword(null); // Clear password when closing
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <KeyRound className="h-4 w-4" />
          Reset Password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Are you sure you want to reset the password for {studentName}? The
            new password will be generated automatically.
          </DialogDescription>
        </DialogHeader>

        {newPassword ? (
          <div className="space-y-4 py-4">
            <div className="rounded-md bg-green-50/50 p-4 border border-green-200">
              <p className="text-sm text-green-800 font-medium mb-2">
                Password reset successful! Please copy this temporary password
                and provide it to the student.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Input
                  value={newPassword}
                  readOnly
                  className="font-mono bg-white"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyPassword}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
