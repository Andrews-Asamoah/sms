"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CrecheReportCard } from "@/components/school/report-cards/templates/creche-report-card";
import { KindergartenReportCard } from "@/components/school/report-cards/templates/kindergarten-report-card";
import { PrimaryReportCard } from "@/components/school/report-cards/templates/primary-report-card";
import { JhsReportCard } from "@/components/school/report-cards/templates/jhs-report-card";
import { Eye, ChevronRight } from "lucide-react";

interface TemplatePreviewDialogProps {
  template: {
    id: string;
    name: string;
    description: string | null;
    layout: any;
    developmentalConfig?: any;
    selConfig?: any;
    disciplineConfig?: any;
  };
}

export function TemplatePreviewDialog({ template }: TemplatePreviewDialogProps) {
  const [open, setOpen] = useState(false);

  const mockStudent = {
    profile: {
      firstName: "Kofi",
      lastName: "Annan",
    },
    admissionNumber: "ADM-2026-008",
    class: { name: "Sample Class" },
  };

  const mockRemarks = [
    {
      content: "Kofi is an excellent and cooperative learner who consistently completes assignments on time. He shows great enthusiasm and plays an active role in class activities.",
    },
  ];

  const renderPreview = () => {
    const layoutType = template.layout?.type;

    switch (layoutType) {
      case "creche":
        return (
          <CrecheReportCard
            student={mockStudent}
            termName="Term 1"
            academicYear="2025/2026"
            developmentalConfig={template.developmentalConfig}
            remarks={mockRemarks}
          />
        );
      case "kindergarten":
        return (
          <KindergartenReportCard
            student={mockStudent}
            termName="Term 1"
            academicYear="2025/2026"
            developmentalConfig={template.developmentalConfig}
            remarks={mockRemarks}
          />
        );
      case "primary":
        return (
          <PrimaryReportCard
            student={mockStudent}
            termName="Term 1"
            academicYear="2025/2026"
            selConfig={template.selConfig}
            remarks={mockRemarks}
          />
        );
      case "jhs":
        return (
          <JhsReportCard
            student={mockStudent}
            termName="Term 1"
            academicYear="2025/2026"
            disciplineConfig={template.disciplineConfig}
            remarks={mockRemarks}
          />
        );
      default:
        return (
          <div className="p-8 text-center text-muted-foreground">
            No layout preview available for type: "{layoutType}"
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-xs text-muted-foreground hover:text-foreground group/btn"
        >
          <Eye className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
          View Layout
          <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover/btn:opacity-100 transition-opacity" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-slate-100 border-border/60">
        <DialogHeader className="pb-4">
          <DialogTitle>Template Preview: {template.name}</DialogTitle>
          <DialogDescription>
            This shows a realistic layout structure of the report card with mock student data.
          </DialogDescription>
        </DialogHeader>
        <div className="p-1 rounded-xl bg-slate-200 border shadow-inner overflow-hidden">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
