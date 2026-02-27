"use client";

import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { ReportCardPDF } from "@/components/school/report-cards/report-card-pdf";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface StudentReportClientProps {
  report: any;
  school: any;
  schoolSlug: string;
}

export function StudentReportClient({
  report,
  school,
  schoolSlug,
}: StudentReportClientProps) {
  // Combine snapshotted data with student info for the PDF
  const pdfData = {
    ...report.data,
    student: {
      name: `${report.student.profile.firstName} ${report.student.profile.lastName}`,
      id: report.student.studentId,
      class: report.set.class?.name || report.data.class,
    },
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 bg-background border-b flex justify-end gap-2">
        <PDFDownloadLink
          document={<ReportCardPDF data={pdfData} school={school} />}
          fileName={`${pdfData.student.name}_Report_Card.pdf`}
        >
          {({ loading }) => (
            <Button disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {loading ? "Preparing PDF..." : "Download PDF"}
            </Button>
          )}
        </PDFDownloadLink>
      </div>

      <div className="flex-1 bg-gray-100 p-4">
        <PDFViewer
          width="100%"
          height="100%"
          className="rounded-lg shadow-lg border-none"
          showToolbar={false}
        >
          <ReportCardPDF data={pdfData} school={school} />
        </PDFViewer>
      </div>
    </div>
  );
}
