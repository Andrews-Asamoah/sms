"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { reviewGradebookSubmission, MarksDataResult } from "@/app/(school)/[schoolSlug]/teacher/classes/[classSlug]/gradebook/actions";
import { MarksEntrySheet } from "@/components/school/marks/marks-entry-sheet";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ReviewPageClientProps {
  schoolSlug: string;
  classId: string;
  subjectId: string;
  termId: string;
  subjectName: string;
  className: string;
  termName: string;
  isAdminView?: boolean;
  marksData: MarksDataResult;
}

export function ReviewPageClient({
  schoolSlug,
  classId,
  subjectId,
  termId,
  subjectName,
  className,
  termName,
  isAdminView = false,
  marksData,
}: ReviewPageClientProps) {
  const router = useRouter();
  const [remarks, setRemarks] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  const handleReview = async (status: "REVIEWED" | "FINAL" | "DRAFT") => {
    if (status === "DRAFT" && !remarks) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsReviewing(true);
    try {
      const result = await reviewGradebookSubmission({
        schoolSlug,
        classId,
        subjectId,
        termId,
        status,
        remarks,
      });

      if (result.success) {
        toast.success(result.message);
        router.push(`/${schoolSlug}/admin/reports/gradebook-tracking`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("An error occurred during review");
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="container py-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/${schoolSlug}/admin/reports/gradebook-tracking`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Review Gradebook: {subjectName}
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
              Class: <span className="font-semibold text-foreground">{className}</span>
              <span className="opacity-20">|</span>
              Term: <span className="font-semibold text-foreground">{termName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => handleReview("DRAFT")}
            disabled={isReviewing}
          >
            <XCircle className="h-4 w-4 text-destructive" />
            Reject Submission
          </Button>
          <Button
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6"
            onClick={() => handleReview("FINAL")}
            disabled={isReviewing}
          >
            {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Approve & Finalize
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Marks Sheet Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
             <div className="bg-muted/30 p-4 border-b">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                   <AlertCircle className="h-4 w-4 text-primary" />
                   Marks Preview (Read-Only)
                </h3>
             </div>
             <div className="p-0">
                <MarksEntrySheet
                  {...marksData}
                  schoolSlug={schoolSlug}
                  classId={classId}
                  subjectId={subjectId}
                  termId={termId}
                  forceReadOnly={true}
                  isAdminView={isAdminView}
                />
             </div>
          </div>
        </div>

        {/* Feedback Area */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6 sticky top-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  Reviewer Remarks
                </label>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Identify specific corrections needed if rejecting.
                </p>
                <Textarea
                  placeholder="e.g. Please check the marks for John Doe..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="min-h-[200px] bg-background resize-none"
                />
              </div>
              
              <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/10">
                 <p className="text-[10px] text-blue-600 dark:text-blue-400 leading-relaxed italic">
                    Note: Approving will mark all scores as FINAL. Rejecting will move them back to DRAFT and show your feedback to the teacher.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
