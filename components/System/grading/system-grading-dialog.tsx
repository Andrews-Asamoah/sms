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
import { SystemGradingForm } from "./system-grading-form";
import { Plus } from "lucide-react";
import { useState } from "react";

interface SystemGradingDialogProps {
  gradingSystem?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function SystemGradingDialog({
  gradingSystem,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
}: SystemGradingDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;
  const onOpenChange = controlledOnOpenChange ?? setUncontrolledOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add System Default
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-primary/20">
        <div className="p-6 border-b bg-muted/30 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <span className="h-8 w-2 bg-primary rounded-full" />
              {gradingSystem
                ? "Edit System Grading Scale"
                : "New System Default Grading Scale"}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground/80">
              {gradingSystem
                ? "Update the details of this system default grading scale."
                : "Create a new grading scale that schools can adopt as their own."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto p-6 md:p-8 flex-1 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20">
          <SystemGradingForm
            id="system-grading-form"
            gradingSystem={gradingSystem}
            onSuccess={() => onOpenChange(false)}
            onLoadingChange={setIsLoading}
          />
        </div>

        <div className="p-4 border-t bg-muted/30 flex justify-end gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="system-grading-form"
            disabled={isLoading}
            className="px-8 font-semibold shadow-lg shadow-primary/20"
          >
            {isLoading
              ? "Saving..."
              : gradingSystem
                ? "Update Scale"
                : "Create Scale"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
