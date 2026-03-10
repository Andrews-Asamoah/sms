"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReportCardSetForm, ClassWithDept } from "./report-card-set-form";

interface ReportCardSetDialogProps {
  schoolSlug: string;
  academicYears: Array<{ id: string; name: string }>;
  terms: Array<{ id: string; name: string; academicYearId: string }>;
  classes: ClassWithDept[];
  templates: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export function ReportCardSetDialog({
  schoolSlug,
  academicYears,
  terms,
  classes,
  templates,
  onSuccess,
}: ReportCardSetDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 group">
          <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
          New Report Set
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle>Create Report Card Set</DialogTitle>
          <DialogDescription>
            Generate report cards for one or more classes. You can select individual classes or pick an entire department.
          </DialogDescription>
        </DialogHeader>
        <ReportCardSetForm
          schoolSlug={schoolSlug}
          academicYears={academicYears}
          terms={terms}
          classes={classes}
          templates={templates}
          onSuccess={() => {
            setOpen(false);
            onSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
