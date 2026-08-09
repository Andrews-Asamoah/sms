"use client";

import { FormalReportCard } from "./formal-report-card";
import { ModernExecutiveReportCard } from "./templates/modern-executive-report-card";
import { JhsReportCard } from "./templates/jhs-report-card";
import { PrimaryReportCard } from "./templates/primary-report-card";
import { KindergartenReportCard } from "./templates/kindergarten-report-card";
import { CrecheReportCard } from "./templates/creche-report-card";

interface DynamicReportCardProps {
  report: any;
  school: any;
  remarks?: any[];
  gradingSystem?: any;
}

export function DynamicReportCard({
  report,
  school,
  remarks = [],
  gradingSystem,
}: DynamicReportCardProps) {
  const layoutType = report?.set?.template?.layout?.type;

  switch (layoutType) {
    case "modern_executive":
    case "modern_terminal":
    case "wesley":
      return (
        <ModernExecutiveReportCard
          report={report}
          school={school}
          remarks={remarks}
          gradingSystem={gradingSystem}
        />
      );
    case "creche":
      return (
        <CrecheReportCard
          student={report.student}
          termName={report.set?.term?.name || "Term"}
          academicYear={report.set?.academicYear?.name || ""}
          developmentalConfig={report.set?.template?.developmentalConfig}
          remarks={remarks}
        />
      );
    case "kindergarten":
      return (
        <KindergartenReportCard
          student={report.student}
          termName={report.set?.term?.name || "Term"}
          academicYear={report.set?.academicYear?.name || ""}
          developmentalConfig={report.set?.template?.developmentalConfig}
          remarks={remarks}
        />
      );
    case "primary":
      return (
        <PrimaryReportCard
          student={report.student}
          termName={report.set?.term?.name || "Term"}
          academicYear={report.set?.academicYear?.name || ""}
          selConfig={report.set?.template?.selConfig}
          remarks={remarks}
          report={report}
          gradingSystem={gradingSystem}
        />
      );
    case "jhs":
      return (
        <JhsReportCard
          student={report.student}
          termName={report.set?.term?.name || "Term"}
          academicYear={report.set?.academicYear?.name || ""}
          disciplineConfig={report.set?.template?.disciplineConfig}
          remarks={remarks}
          report={report}
          gradingSystem={gradingSystem}
        />
      );
    case "classic":
    case "formal":
    default:
      return (
        <FormalReportCard
          report={report}
          school={school}
          remarks={remarks}
          gradingSystem={gradingSystem}
        />
      );
  }
}
