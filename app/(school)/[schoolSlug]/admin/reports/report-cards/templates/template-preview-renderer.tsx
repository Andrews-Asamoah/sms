"use client";

import { CrecheReportCard } from "@/components/school/report-cards/templates/creche-report-card";
import { KindergartenReportCard } from "@/components/school/report-cards/templates/kindergarten-report-card";
import { PrimaryReportCard } from "@/components/school/report-cards/templates/primary-report-card";
import { JhsReportCard } from "@/components/school/report-cards/templates/jhs-report-card";
import { ModernExecutiveReportCard } from "@/components/school/report-cards/templates/modern-executive-report-card";
import { FormalReportCard } from "@/components/school/report-cards/formal-report-card";
import { AlertCircle } from "lucide-react";

interface TemplatePreviewRendererProps {
  template: {
    id: string;
    name: string;
    description?: string | null;
    layout: any;
    developmentalConfig?: any;
    selConfig?: any;
    disciplineConfig?: any;
  };
}

const mockStudent = {
  profile: {
    firstName: "Nana Yaa",
    lastName: "Owusu",
    gender: "Female",
    user: { image: null },
  },
  studentId: "SCH/2026/0142",
  admissionNumber: "SCH/2026/0142",
  class: { name: "JHS 2 Gold" },
};

const mockSchool = {
  name: "Sample International School",
  address: "123 Education Way | P. O. Box 100",
  motto: "Knowledge & Excellence",
  headmasterName: "Head Teacher",
  logo: null,
};

const mockRemarks = [
  {
    remarkType: "GENERAL",
    content:
      "Nana Yaa has had an outstanding term, showing consistent effort and curiosity across all subjects, especially the sciences. She should keep up the excellent reading habit and continue supporting classmates during group work.",
  },
  {
    remarkType: "HEADTEACHER",
    content:
      "A commendable result. Keep working hard and aim even higher next term.",
  },
];

export function TemplatePreviewRenderer({ template }: TemplatePreviewRendererProps) {
  const layoutType = template.layout?.type;

  switch (layoutType) {
    case "modern_executive":
    case "modern_terminal":
    case "wesley":
      return (
        <ModernExecutiveReportCard
          sampleMode={true}
          school={mockSchool}
          remarks={mockRemarks}
        />
      );

    case "classic":
    case "formal":
      return (
        <FormalReportCard
          report={{
            data: {
              class: "JHS 2 Gold",
              subjects: [
                { subjectName: "English Language", classWorkScore: 26, examScore: 61, totalScore: 87, grade: "1", remarks: "Excellent" },
                { subjectName: "Mathematics", classWorkScore: 24, examScore: 58, totalScore: 82, grade: "2", remarks: "Very Good" },
                { subjectName: "Integrated Science", classWorkScore: 27, examScore: 64, totalScore: 91, grade: "1", remarks: "Excellent" },
                { subjectName: "Social Studies", classWorkScore: 23, examScore: 55, totalScore: 78, grade: "2", remarks: "Very Good" },
                { subjectName: "Religious & Moral Ed.", classWorkScore: 25, examScore: 57, totalScore: 82, grade: "2", remarks: "Very Good" },
                { subjectName: "Ghanaian Language", classWorkScore: 22, examScore: 50, totalScore: 72, grade: "3", remarks: "Good" },
                { subjectName: "French", classWorkScore: 20, examScore: 46, totalScore: 66, grade: "4", remarks: "Good" },
                { subjectName: "Computing (ICT)", classWorkScore: 27, examScore: 60, totalScore: 87, grade: "1", remarks: "Excellent" },
                { subjectName: "Career Technology", classWorkScore: 24, examScore: 52, totalScore: 76, grade: "3", remarks: "Good" },
                { subjectName: "Creative Arts & Design", classWorkScore: 26, examScore: 56, totalScore: 82, grade: "2", remarks: "Very Good" },
              ],
              position: 3,
              positionSuffix: "rd",
              classCount: 42,
              attendance: "58 / 60",
            },
            student: mockStudent,
            set: {
              term: { name: "Second Term" },
              academicYear: { name: "2025/2026" },
            },
          }}
          school={mockSchool}
          remarks={mockRemarks}
          gradingSystem={null}
        />
      );

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
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            No preview available for layout type: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{layoutType ?? "unknown"}</code>
          </p>
        </div>
      );
  }
}
