"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Eye, X, Download, Loader2 } from "lucide-react";
import { TemplatePreviewRenderer } from "./template-preview-renderer";
import dynamic from "next/dynamic";
import { ReportCardPDF } from "@/components/school/report-cards/report-card-pdf";

// Lazy-load BlobProvider so @react-pdf/renderer never runs on the server
const BlobProvider = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.BlobProvider),
  { ssr: false }
);

const SAMPLE_PDF_DATA = {
  studentName: "Nana Yaa Owusu",
  studentId: "SCH/2026/0142",
  class: "JHS 2 Gold",
  term: "Second Term",
  academicYear: "2025/2026",
  gender: "Female",
  position: 3,
  positionSuffix: "rd",
  classCount: 42,
  attendance: "58 / 60",
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
  classTeacherRemark: "Nana Yaa has had an outstanding term, showing consistent effort and curiosity across all subjects.",
  headmasterRemark: "A commendable result. Keep working hard and aim even higher next term.",
  behavioral: { general: "Good conduct throughout the term." },
  school: {
    name: "Sample International School",
    address: "123 Education Way | P. O. Box 100",
    motto: "Knowledge & Excellence",
  },
};

interface TemplatePreviewDialogProps {
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

// ── Component to auto-trigger browser download as soon as PDF URL is generated ──
function AutoPdfDownloader({
  url,
  loading,
  fileName,
  onDone,
}: {
  url: string | null;
  loading: boolean;
  fileName: string;
  onDone: () => void;
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
      } catch (err) {
        console.error("Automatic PDF download failed", err);
      } finally {
        onDone();
      }
    }
  }, [url, loading, fileName, onDone]);

  return (
    <Button size="sm" variant="outline" disabled className="gap-2 shrink-0">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      <span className="hidden sm:inline">Generating PDF…</span>
    </Button>
  );
}

export function TemplatePreviewDialog({ template }: TemplatePreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleOpen = useCallback(() => {
    setIsDownloading(false);
    setOpen(true);
  }, []);

  const fileName = `${template.name.replace(/\s+/g, "_")}_Sample.pdf`;

  const overlay = mounted && open
    ? createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col bg-background animate-in fade-in duration-200">
          {/* ── Top Bar ── */}
          <div className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-border/60 bg-background/95 backdrop-blur shrink-0">
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-border/50 hover:bg-muted transition-colors shrink-0"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-primary uppercase tracking-widest leading-none">Template Preview</p>
              <h2 className="text-sm font-black truncate leading-snug">{template.name}</h2>
            </div>

            <span className="hidden sm:inline-block text-xs text-muted-foreground italic shrink-0">
              Sample data shown
            </span>

            {/* Single-Click Auto PDF Download */}
            {!isDownloading ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 shrink-0"
                onClick={() => setIsDownloading(true)}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download PDF</span>
              </Button>
            ) : (
              <BlobProvider
                document={
                  <ReportCardPDF
                    data={SAMPLE_PDF_DATA as any}
                    school={SAMPLE_PDF_DATA.school as any}
                    gradingSystem={undefined}
                  />
                }
              >
                {({ url, loading }) => (
                  <AutoPdfDownloader
                    url={url}
                    loading={loading}
                    fileName={fileName}
                    onDone={() => setIsDownloading(false)}
                  />
                )}
              </BlobProvider>
            )}
          </div>

          {/* ── Scrollable Preview Body ── */}
          <div className="flex-1 overflow-y-auto bg-muted/20">
            <div className="py-6 px-2 md:px-6">
              <TemplatePreviewRenderer template={template} />
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="flex-1 text-xs text-muted-foreground hover:text-foreground group/btn"
        onClick={handleOpen}
      >
        <Eye className="h-3.5 w-3.5 mr-1.5 text-muted-foreground group-hover/btn:text-foreground transition-colors" />
        View Layout
      </Button>

      {overlay}
    </>
  );
}
