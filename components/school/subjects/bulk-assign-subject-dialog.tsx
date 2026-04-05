"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { bulkAssignSubjectToDepartment } from "@/app/(school)/[schoolSlug]/admin/academics/subjects/actions";

interface BulkAssignSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: {
    id: string;
    name: string;
    departments: Array<{ id: string; name: string }>;
  };
  schoolSlug: string;
  teachers: Array<{ id: string; profile: { firstName: string; lastName: string } }>;
}

export function BulkAssignSubjectDialog({
  open,
  onOpenChange,
  subject,
  schoolSlug,
  teachers,
}: BulkAssignSubjectDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("none");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartmentId) {
      toast.error("Please select a department");
      return;
    }

    startTransition(async () => {
      const finalTeacherId = selectedTeacherId === "none" ? undefined : selectedTeacherId;
      const result = await bulkAssignSubjectToDepartment(
        schoolSlug,
        subject.id,
        selectedDepartmentId,
        finalTeacherId
      );

      if (result.success) {
        toast.success(result.message || "Subject assigned to classes successfully");
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to assign subject");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Assign Subject</DialogTitle>
          <DialogDescription>
            Assign <strong>{subject.name}</strong> to every class in a specific department simultaneously.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            {subject.departments.length === 0 ? (
              <p className="text-sm text-destructive">
                This subject is not assigned to any departments. Edit the subject first to assign it to a department.
              </p>
            ) : (
              <Select
                value={selectedDepartmentId}
                onValueChange={setSelectedDepartmentId}
                required
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {subject.departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher">Assigned Teacher (Optional)</Label>
            <Select
              value={selectedTeacherId}
              onValueChange={setSelectedTeacherId}
            >
              <SelectTrigger id="teacher">
                <SelectValue placeholder="Select teacher (or leave None)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Do not assign a teacher)</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.profile.firstName} {t.profile.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              If selected, this teacher will be automatically assigned to all the receiving classes for this subject.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending || subject.departments.length === 0}
            >
              {isPending ? "Assigning..." : "Assign to Classes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
