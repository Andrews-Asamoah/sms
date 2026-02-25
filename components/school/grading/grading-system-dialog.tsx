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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-primary/20">
        <div className="p-6 border-b bg-muted/30 sticky top-0 z-20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <span className="h-8 w-2 bg-primary rounded-full" />
              {gradingSystem ? "Edit Grading System" : "Add Grading System"}
            </DialogTitle>
            <DialogDescription className="text-base">
              {gradingSystem
                ? "Make changes to the grading system details below."
                : "Create a new grading system for assessments."}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="overflow-y-auto p-6 md:p-8 flex-1">
          <GradingSystemForm
            schoolSlug={schoolSlug}
            gradingSystem={gradingSystem}
            onSuccess={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
