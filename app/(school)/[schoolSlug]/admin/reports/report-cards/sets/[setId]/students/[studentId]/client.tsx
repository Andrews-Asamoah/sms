"use client";

import { useEffect, useState } from "react";
import { FormalReportCard } from "@/components/school/report-cards/formal-report-card";
import dynamic_next from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { ReportCardPDF } from "@/components/school/report-cards/report-card-pdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BlobProvider = dynamic_next(
  () => import("@react-pdf/renderer").then((mod) => mod.BlobProvider),
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
  const [mounted, setMounted] = useState(false);
  const [activeDownload, setActiveDownload] = useState<{
    reportData: any;
    fileName: string;
  } | null>(null);

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

  return (
    <div className="flex-1 flex flex-col">
      {/* Action bar */}
      <div className="p-3 bg-background border-b flex justify-end gap-2 print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setActiveDownload({
              reportData: pdfData,
              fileName: `${report.student.profile.firstName}_${report.student.profile.lastName}_Report.pdf`,
            })
          }
        >
          <Download className="w-4 h-4 mr-2" /> Download PDF
        </Button>
      </div>

      {/* Formal web report card */}
      <FormalReportCard
        report={report}
        school={school}
        remarks={remarks}
        gradingSystem={gradingSystem}
      />

      {/* Dynamic Lazy PDF Downloader */}
      {activeDownload && (
        <BlobProvider
          document={
            <ReportCardPDF
              data={activeDownload.reportData}
              school={school}
              remarks={remarks}
            />
          }
        >
          {({ url, loading }) => {
            return (
              <PdfDownloaderModal
                url={url}
                loading={loading}
                fileName={activeDownload.fileName}
                onClose={() => setActiveDownload(null)}
              />
            );
          }}
        </BlobProvider>
      )}
    </div>
  );
}

// Helper component for dynamic PDF downloads
function PdfDownloaderModal({
  url,
  loading,
  fileName,
  onClose,
}: {
  url: string | null;
  loading: boolean;
  fileName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!loading && url) {
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onClose();
      } catch (err) {
        console.error("Automatic download failed", err);
      }
    }
  }, [url, loading, fileName, onClose]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                Generating PDF...
              </>
            ) : (
              "PDF Generated successfully"
            )}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "We are preparing your report card PDF download. This will only take a moment."
              : "Your download has started. If it didn't start automatically, please use the button below."}
          </DialogDescription>
        </DialogHeader>
        {!loading && url && (
          <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
            <Button asChild className="w-full">
              <a href={url} download={fileName} onClick={onClose}>
                Download PDF
              </a>
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
