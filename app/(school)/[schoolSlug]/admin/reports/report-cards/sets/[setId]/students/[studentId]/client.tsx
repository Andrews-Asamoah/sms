"use client";

import { useEffect, useState } from "react";
import { FormalReportCard } from "@/components/school/report-cards/formal-report-card";
import dynamic_next from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Pencil } from "lucide-react";
import { ReportCardEditorDialog } from "@/components/school/report-cards/report-card-editor-dialog";
import { updateReportCardData } from "../../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
// Import statically — ReportCardPDF only uses @react-pdf/renderer primitives (no browser/DOM APIs)
// and must be a real Document element, not a Next.js dynamic wrapper, for the PDF renderer to parse it.
import { ReportCardPDF } from "@/components/school/report-cards/report-card-pdf";

const PDFDownloadLink = dynamic_next(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false },
);

interface AdminReportCardClientProps {
  report: any;
  school: any;
  schoolSlug: string;
  remarks: any[];
  gradingSystem: any;
}

export function AdminReportCardClient({
  report,
  school,
  schoolSlug,
  remarks,
  gradingSystem,
}: AdminReportCardClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const btn = document.getElementById("print-report-btn");
    if (btn) btn.onclick = () => window.print();
  }, []);

  const pdfData = {
    ...report.data,
    student: {
      name: `${report.student.profile.firstName} ${report.student.profile.lastName}`,
      id: report.student.studentId,
      class: report.set.class?.name || report.data?.class,
    },
  };

  const handleSaveData = async (updatedData: any) => {
    try {
      const result = await updateReportCardData(schoolSlug, report.setId, report.studentId, updatedData);
      if (result.success) {
        toast.success("Report card data updated successfully");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update report card");
      }
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Action bar */}
      <div className="p-3 bg-background border-b flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="w-4 h-4 mr-2" /> Edit Data
        </Button>
        {mounted ? (
          <PDFDownloadLink
            document={<ReportCardPDF data={pdfData} school={school} />}
            fileName={`${report.student.profile.firstName}_${report.student.profile.lastName}_Report.pdf`}
          >
            {({ loading }) => (
              <Button variant="outline" size="sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {loading ? "Preparing PDF…" : "Download PDF"}
              </Button>
            )}
          </PDFDownloadLink>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <Download className="w-4 h-4 mr-2 opacity-50" />
            Download PDF
          </Button>
        )}
      </div>

      {/* Formal web report card */}
      <FormalReportCard
        report={report}
        school={school}
        remarks={remarks}
        gradingSystem={gradingSystem}
      />

      {/* Edit Dialog */}
      <ReportCardEditorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        reportData={report.data}
        onSave={handleSaveData}
      />
    </div>
  );
}
