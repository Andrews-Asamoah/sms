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
import { ExamForm } from "./exam-form";
import { Plus } from "lucide-react";
import { useState } from "react";

interface ExamDialogProps {
  schoolSlug: string;
  exam?: any;
  gradingSystems: Array<{ id: string; name: string }>;
  classes: Array<{ id: string; name: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function ExamDialog({
  schoolSlug,
  exam,
  gradingSystems,
  classes,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
}: ExamDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;
  const onOpenChange = controlledOnOpenChange ?? setUncontrolledOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Examination
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {exam ? "Edit Examination" : "Add Examination"}
          </DialogTitle>
          <DialogDescription>
            {exam
              ? "Make changes to the examination details below."
              : "Create a new examination template."}
          </DialogDescription>
        </DialogHeader>
        <ExamForm
          schoolSlug={schoolSlug}
          exam={exam}
          gradingSystems={gradingSystems}
          classes={classes}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
