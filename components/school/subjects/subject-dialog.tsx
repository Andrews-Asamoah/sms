"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubjectForm } from "./subject-form";
import { Plus } from "lucide-react";
import { useState } from "react";

interface SubjectDialogProps {
  schoolSlug: string;
  subject?: any;
  departments: Array<{ id: string; name: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function SubjectDialog({
  schoolSlug,
  subject,
  departments,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
}: SubjectDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;
  const onOpenChange = controlledOnOpenChange ?? setUncontrolledOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Subject
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subject ? "Edit Subject" : "Add Subject"}</DialogTitle>
          <DialogDescription>
            {subject
              ? "Make changes to the subject details below."
              : "Create a new subject for your curriculum."}
          </DialogDescription>
        </DialogHeader>
        <SubjectForm
          schoolSlug={schoolSlug}
          subject={subject}
          departments={departments}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
