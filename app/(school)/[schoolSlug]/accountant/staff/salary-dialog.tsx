// app/(school)/[schoolSlug]/accountant/people/staff/salary-dialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateStaffSalary } from "./actions";

interface SalaryDialogProps {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    salary: number;
    type: "TEACHER" | "STAFF";
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolSlug: string;
}

export function SalaryDialog({
  member,
  open,
  onOpenChange,
  schoolSlug,
} : SalaryDialogProps) {
  const [salary, setSalary] = useState<string>(member?.salary.toString() || "0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    try {
      setIsSubmitting(true);
      await updateStaffSalary(schoolSlug, member.id, member.type, parseFloat(salary));
      toast.success("Salary updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update salary");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Salary</DialogTitle>
            <DialogDescription>
              Update the monthly salary for {member?.firstName} {member?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="salary" className="text-right">
                Salary
              </Label>
              <Input
                id="salary"
                type="number"
                step="0.01"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
