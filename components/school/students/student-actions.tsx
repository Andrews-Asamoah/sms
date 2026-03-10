// components/school/students/student-actions.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Key,
  Loader2,
  Copy,
  Check,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Student } from "./columns";
import { useState } from "react";
import { toast } from "sonner";

interface StudentActionsProps {
  student: Student;
}

export function StudentActions({ student }: StudentActionsProps) {
  const pathname = usePathname();
  const schoolSlug = pathname.split("/")[1];
  const [isResetPending, setIsResetPending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleResetPassword = async () => {
    try {
      setIsResetPending(true);
      const res = await fetch(
        `/api/schools/${schoolSlug}/students/${student.id}/reset-password`,
        {
          method: "POST",
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setNewPassword(data.newPassword);
      toast.success("Password reset successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsResetPending(false);
      setShowConfirm(false);
    }
  };

  const copyToClipboard = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Password copied to clipboard");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(student.id)}
          >
            Copy student ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/${schoolSlug}/admin/students/${student.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${schoolSlug}/admin/students/${student.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit student
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-700 hover:bg-red-50"
            onClick={() => setShowConfirm(true)}
          >
            <Key className="mr-2 h-4 w-4" />
            Reset Password
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new random password for{" "}
              <span className="font-semibold text-foreground">
                {student.profile.firstName} {student.profile.lastName}
              </span>
              . The old password will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                handleResetPassword();
              }}
              disabled={isResetPending}
            >
              {isResetPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Reset Password"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Password Display Dialog */}
      <Dialog open={!!newPassword} onOpenChange={() => setNewPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary Password Generated</DialogTitle>
            <DialogDescription>
              Please share this new password with the student. They should
              change it after logging in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg border">
            <code className="flex-1 font-mono text-lg font-bold text-center">
              {newPassword}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              className="h-10 w-10"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setNewPassword(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
