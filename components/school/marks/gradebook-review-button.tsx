import Link from "next/link";
import { Button } from "@/components/ui/button";

interface GradebookReviewButtonProps {
  schoolSlug: string;
  classId: string;
  subjectId: string;
  termId: string;
  subjectName: string;
  className: string;
}

export function GradebookReviewButton({
  schoolSlug,
  classId,
  subjectId,
  termId,
}: GradebookReviewButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10 font-semibold"
      asChild
    >
      <Link
        href={`/${schoolSlug}/admin/reports/gradebook-tracking/review?classId=${classId}&subjectId=${subjectId}&termId=${termId}`}
      >
        Review
      </Link>
    </Button>
  );
}
