"use client";

import { FormalReportCard } from "@/components/school/report-cards/formal-report-card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface GuardianReportCardViewProps {
  report: any;
  school: any;
  remarks: any[];
  gradingSystem: any;
}

export function GuardianReportCardView({
  report,
  school,
  remarks,
  gradingSystem,
}: GuardianReportCardViewProps) {
  return (
    <div className="flex-1">
      {/* Print button */}
      <div className="flex justify-end p-4 bg-white border-b print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Print Report Card
        </Button>
      </div>

      <FormalReportCard
        report={report}
        school={school}
        remarks={remarks}
        gradingSystem={gradingSystem}
      />
    </div>
  );
}
