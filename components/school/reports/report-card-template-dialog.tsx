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
import { ReportCardTemplateForm } from "./report-card-template-form";

interface ReportCardTemplateDialogProps {
  schoolSlug: string;
  onSuccess?: () => void;
}

export function ReportCardTemplateDialog({
  schoolSlug,
  onSuccess,
}: ReportCardTemplateDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Report Card Template</DialogTitle>
          <DialogDescription>
            Configure the layout and sections for student report cards.
          </DialogDescription>
        </DialogHeader>
        <ReportCardTemplateForm
          schoolSlug={schoolSlug}
          onSuccess={() => {
            setOpen(false);
            onSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
