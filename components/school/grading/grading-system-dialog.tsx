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
import { GradingSystemForm } from "./grading-system-form";
import { Plus } from "lucide-react";
import { useState } from "react";

interface GradingSystemDialogProps {
  schoolSlug: string;
  gradingSystem?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function GradingSystemDialog({
  schoolSlug,
  gradingSystem,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
}: GradingSystemDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;
  const onOpenChange = controlledOnOpenChange ?? setUncontrolledOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Grading System
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {gradingSystem ? "Edit Grading System" : "Add Grading System"}
          </DialogTitle>
          <DialogDescription>
            {gradingSystem
              ? "Make changes to the grading system details below."
              : "Create a new grading system for assessments."}
          </DialogDescription>
        </DialogHeader>
        <GradingSystemForm
          schoolSlug={schoolSlug}
          gradingSystem={gradingSystem}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
