"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  BookOpen,
  Users,
  CalendarDays,
  ShieldCheck,
  MessageSquare,
  TriangleAlert,
  Clock,
} from "lucide-react";
import {
  reviewGradebookSubmission,
  MarksDataResult,
} from "@/app/(school)/[schoolSlug]/teacher/classes/[classSlug]/gradebook/actions";
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
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);

  const studentCount = marksData.students.length;
  const finalCount = marksData.existingScores.filter((s) => s.status === "FINAL").length;
  const reviewedCount = marksData.existingScores.filter((s) => s.status === "REVIEWED").length;
  const submittedCount = marksData.existingScores.filter(
    (s) => s.status === "SUBMITTED" || s.status === "REVIEWED" || s.status === "FINAL"
  ).length;

  // Derive the overall status for display
  const isFullyFinalized = finalCount > 0 && finalCount === marksData.existingScores.length;
  const isPartiallyFinalized = finalCount > 0;
  const isReviewedState = reviewedCount > 0 && finalCount === 0;
  const hasSubmissions = submittedCount > 0;

  const overallStatus = isFullyFinalized
    ? "FINAL"
    : isPartiallyFinalized
    ? "PARTIAL_FINAL"
    : isReviewedState
    ? "REVIEWED"
    : hasSubmissions
    ? "SUBMITTED"
    : "DRAFT";

  const handleReview = async (status: "REVIEWED" | "FINAL" | "DRAFT") => {
    if (status === "DRAFT" && !remarks.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsReviewing(true);
    setReviewAction(status === "DRAFT" ? "reject" : "approve");
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
      setReviewAction(null);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Back + Title */}
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" asChild className="shrink-0 h-8 w-8">
                <Link href={`/${schoolSlug}/admin/reports/gradebook-tracking`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-bold tracking-tight truncate">
                    Reviewing: <span className="text-primary">{subjectName}</span>
                  </h1>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {className}
                    </span>
                    <span className="opacity-30">·</span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {termName}
                    </span>
                    <span className="opacity-30">·</span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {marksData.template.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status summary */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              {overallStatus === "FINAL" && (
                <Badge
                  variant="outline"
                  className="text-xs gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Finalized
                </Badge>
              )}
              {overallStatus === "PARTIAL_FINAL" && (
                <Badge
                  variant="outline"
                  className="text-xs gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Partially Finalized
                </Badge>
              )}
              {overallStatus === "REVIEWED" && (
                <Badge
                  variant="outline"
                  className="text-xs gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Under Review
                </Badge>
              )}
              {overallStatus === "SUBMITTED" && (
                <Badge
                  variant="outline"
                  className="text-xs gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                >
                  <Clock className="h-3 w-3" />
                  Awaiting Review
                </Badge>
              )}
              {overallStatus === "DRAFT" && (
                <Badge
                  variant="outline"
                  className="text-xs gap-1.5 bg-muted text-muted-foreground border-muted-foreground/20"
                >
                  <Clock className="h-3 w-3" />
                  In Progress
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={`text-xs ${
                  isFullyFinalized
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : ""
                }`}
              >
                {isFullyFinalized
                  ? `${finalCount}/${studentCount} finalized`
                  : `${submittedCount}/${studentCount} submitted`}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <div className="container max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid xl:grid-cols-[1fr_320px] gap-6">
          {/* ── Left: Marks Preview ──────────────────────────────────────── */}
          <div className="space-y-4 min-w-0">
            {/* Preview label bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <div className={`h-1.5 w-1.5 rounded-full ${
                  isFullyFinalized ? "bg-emerald-500" : "bg-primary animate-pulse"
                }`} />
                {isFullyFinalized
                  ? "Finalized — marks have been approved and locked"
                  : "Read-only preview — marks cannot be edited from this view"}
              </div>
              <Badge variant="outline" className="text-xs gap-1 bg-card">
                <Users className="h-3 w-3" />
                {studentCount} Students
              </Badge>
            </div>

            {/* Marks sheet */}
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <MarksEntrySheet
                {...marksData}
                schoolSlug={schoolSlug}
                classId={classId}
                subjectId={subjectId}
                termId={termId}
                forceReadOnly={true}
                isAdminView={isAdminView}
                className={className}
              />
            </div>
          </div>

          {/* ── Right: Review Panel ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="sticky top-[73px] space-y-4">
              {/* Reviewer Remarks Card */}
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b bg-muted/30 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Reviewer Remarks</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Add feedback for the teacher. This is <strong>required</strong> when rejecting a submission.
                    </p>
                    <Textarea
                      id="reviewer-remarks"
                      placeholder="e.g. Please check the marks for John Doe in Class Test 2..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="min-h-[160px] bg-background resize-none text-sm"
                    />
                  </div>

                  {/* Info note */}
                  <div className="flex gap-2.5 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <TriangleAlert className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
                      <strong>Approve & Finalize</strong> marks all scores as{" "}
                      <code className="bg-blue-500/10 px-1 rounded text-[10px]">FINAL</code>. 
                      {" "}<strong>Reject</strong> resets them to{" "}
                      <code className="bg-blue-500/10 px-1 rounded text-[10px]">DRAFT</code> and shows your feedback to the teacher.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Card */}
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b bg-muted/30">
                  <h3 className="text-sm font-semibold">Review Decision</h3>
                </div>
                <div className="p-5 space-y-3">
                  {isFullyFinalized ? (
                    /* Already finalized — show confirmation state */
                    <div className="flex flex-col items-center gap-3 py-2 text-center">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Gradebook Finalized</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          All {finalCount} student records have been approved and locked.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 mt-1 border-destructive/30 text-destructive hover:bg-destructive/5"
                        onClick={() => handleReview("DRAFT")}
                        disabled={isReviewing || !remarks.trim()}
                        title={!remarks.trim() ? "Add remarks above before rejecting" : "Revert to draft for corrections"}
                      >
                        {isReviewing && reviewAction === "reject" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Revert & Reject
                      </Button>
                      {!remarks.trim() && (
                        <p className="text-[11px] text-muted-foreground">
                          Add remarks above to enable rejection
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Pending review — show approve / reject actions */
                    <>
                      <Button
                        id="approve-finalize-btn"
                        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-10"
                        onClick={() => handleReview("FINAL")}
                        disabled={isReviewing}
                      >
                        {isReviewing && reviewAction === "approve" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Approve & Finalize
                      </Button>

                      <div className="relative flex items-center gap-2">
                        <Separator className="flex-1" />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide px-1">or</span>
                        <Separator className="flex-1" />
                      </div>

                      <Button
                        id="reject-submission-btn"
                        variant="outline"
                        className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive/50 h-10"
                        onClick={() => handleReview("DRAFT")}
                        disabled={isReviewing || !remarks.trim()}
                        title={!remarks.trim() ? "Enter remarks explaining the rejection reason" : undefined}
                      >
                        {isReviewing && reviewAction === "reject" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Reject Submission
                      </Button>

                      {!remarks.trim() && (
                        <p className="text-[11px] text-muted-foreground text-center">
                          Add remarks above to enable rejection
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Summary Stats Card */}
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b bg-muted/30">
                  <h3 className="text-sm font-semibold">Submission Summary</h3>
                </div>
                <div className="p-5">
                  <dl className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <dt className="text-muted-foreground">Total Students</dt>
                      <dd className="font-semibold">{studentCount}</dd>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <dt className="text-muted-foreground">Scores Submitted</dt>
                      <dd className="font-semibold text-emerald-600 dark:text-emerald-400">{submittedCount}</dd>
                    </div>
                    {finalCount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <dt className="text-muted-foreground">Finalized</dt>
                        <dd className="font-semibold text-emerald-600 dark:text-emerald-400">{finalCount}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <dt className="text-muted-foreground">Pending / Draft</dt>
                      <dd className="font-semibold text-amber-600 dark:text-amber-400">
                        {studentCount - submittedCount}
                      </dd>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <dt className="text-muted-foreground">Assessment</dt>
                      <dd className="font-medium text-right max-w-[140px] truncate" title={marksData.template.name}>
                        {marksData.template.name}
                      </dd>
                    </div>
                    {marksData.template.deadline && (
                      <div className="flex items-center justify-between text-sm">
                        <dt className="text-muted-foreground">Deadline</dt>
                        <dd className="font-medium">
                          {new Date(marksData.template.deadline).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
