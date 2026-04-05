import { getMarksData } from "@/app/(school)/[schoolSlug]/teacher/classes/[classSlug]/gradebook/actions";
import { ReviewPageClient } from "./review-page-client";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

interface ReviewPageProps {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{
    classId?: string;
    subjectId?: string;
    termId?: string;
  }>;
}

export default async function GradebookReviewPage({
  params,
  searchParams,
}: ReviewPageProps) {
  const { schoolSlug } = await params;
  const { classId, subjectId, termId } = await searchParams;

  if (!classId || !subjectId || !termId) {
    redirect(`/${schoolSlug}/admin/reports/gradebook-tracking`);
  }

  // Fetch contextual info for labels
  const [cls, subject, term] = await Promise.all([
    prisma.class.findUnique({ where: { id: classId }, select: { name: true } }),
    prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } }),
    prisma.term.findUnique({ where: { id: termId }, select: { name: true } }),
  ]);

  const result = await getMarksData(schoolSlug, classId, subjectId, termId);

  if (!result.success) {
     return (
       <div className="container py-20 text-center">
         <h1 className="text-2xl font-bold text-destructive">Failed to load review data</h1>
         <p className="text-muted-foreground mt-2">{result.error}</p>
       </div>
     );
  }

  return (
    <ReviewPageClient
      schoolSlug={schoolSlug}
      classId={classId}
      subjectId={subjectId}
      termId={termId}
      subjectName={subject?.name || "Unknown"}
      className={cls?.name || "Unknown"}
      termName={term?.name || termId}
      isAdminView={true}
      marksData={result.data}
    />
  );
}
