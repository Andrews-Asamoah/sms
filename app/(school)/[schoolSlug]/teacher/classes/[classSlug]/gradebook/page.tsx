import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole, getActiveSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getMarksData } from "./actions";
import { MarksEntrySheet } from "@/components/school/marks/marks-entry-sheet";
import { GradebookToolbar } from "./toolbar";
import { MarksEntrySheetProps } from "./types";

interface GradebookPageProps {
  params: Promise<{
    schoolSlug: string;
    classSlug: string;
  }>;
  searchParams: Promise<{
    subjectId?: string;
    termId?: string;
  }>;
}

export default async function GradebookPage({
  params,
  searchParams,
}: GradebookPageProps) {
  const { schoolSlug, classSlug } = await params;
  const { subjectId, termId } = await searchParams;

  const session = await requireSchoolAccess(schoolSlug);
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  const effectiveRole = activeRole?.effectiveRole || "teacher";

  if (
    !["teacher", "admin", "owner", "headteacher"].includes(effectiveRole) &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  // Fetch Class Details
  const classData = await prisma.class.findFirst({
    where: {
      OR: [{ slug: classSlug }, { id: classSlug }],
      schoolId: (
        await prisma.school.findUnique({
          where: { subdomain: schoolSlug },
          select: { id: true },
        })
      )?.id,
    },
    select: {
      id: true,
      name: true,
      academicYearId: true,
      academicYear: { select: { name: true } },
    },
  });

  if (!classData) {
    return <div>Class not found</div>;
  }

  // Fetch Teacher's Profile (if teacher)
  // If admin, show all subjects for that class
  // We need to find the teacher record associated with this user
  // Look up teacher by user ID and school subdomain
  const teacher = await prisma.teacher.findFirst({
    where: {
      school: { subdomain: schoolSlug },
      profile: { userId: session.user.id },
    },
    select: { id: true },
  });
  const teacherId = teacher?.id;

  // Fetch Assigned Subjects for this Class (filtered by teacher if applicable)
  // If role is specifically teacher, we strictly filter by their assignments
  const isRestrictedTeacher = effectiveRole === "teacher";

  const assignedSubjects = await prisma.classSubject.findMany({
    where: {
      classId: classData.id,
      // If teacher role active, restrict to their subjects
      ...(isRestrictedTeacher && teacherId ? { teacherId: teacherId } : {}),
    },
    include: {
      subject: true,
    },
  });

  // Fetch Active Term
  const terms = await prisma.term.findMany({
    where: {
      academicYearId: classData.academicYearId,
    },
    orderBy: { startDate: "desc" },
  });

  const activeTerm = terms.find((t) => t.isCurrent) || terms[0];
  const selectedTermId = termId || activeTerm?.id;

  if (!effectiveRole) {
    // Silent fail or handled by layout
  }

  // Determine selected subject
  // If subjectId provided, check it is in assignedSubjects
  const selectedSubject = subjectId
    ? assignedSubjects.find((s) => s.subject.id === subjectId)?.subject
    : assignedSubjects[0]?.subject;

  // Render Logic

  // 1. If NO subjects assigned to this teacher for this class
  if (assignedSubjects.length === 0) {
    return (
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/${schoolSlug}/teacher/gradebook`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{classData.name} Gradebook</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Subjects Assigned</AlertTitle>
          <AlertDescription>
            You are not assigned to teach any subjects in this class. Please
            contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 2. If subject/term selected, fetch marks data
  let marksData: Pick<
    MarksEntrySheetProps,
    "students" | "template" | "existingScores" | "extension" | "isPublished"
  > | null = null;
  let error = null;

  if (selectedSubject && selectedTermId) {
    const result = await getMarksData(
      schoolSlug,
      classData.id,
      selectedSubject.id,
      selectedTermId,
    );
    if (result.success && result.data) {
      const rawData = result.data;

      // Transform Prisma text/decimal types to what the component expects
      marksData = {
        students: rawData.students.map((s) => ({
          id: s.id,
          admissionNumber: s.admissionNumber,
          user: {
            firstName: s.user.firstName,
            lastName: s.user.lastName,
            otherNames: s.user.otherNames,
            email: s.user.email,
            image: s.user.image,
          },
        })),
        template: {
          id: rawData.template.id,
          name: rawData.template.name,
          deadline: rawData.template.deadline,
          isLocked: rawData.template.isLocked,
          components: rawData.template.components.map((c) => ({
            id: c.id,
            name: c.name,
            maxMarks: Number(c.maxMarks),
            weight: Number(c.weight),
            isRepeatable: c.isRepeatable,
            expectedCount: c.expectedCount,
          })),
          gradingSystem: {
            gradeScales: rawData.template.gradingSystem.gradeScales.map(
              (gs) => ({
                id: gs.id,
                grade: gs.grade,
                minScore: Number(gs.minScore),
                maxScore: Number(gs.maxScore),
                gradePoint: Number(gs.gradePoint),
                description: gs.description,
              }),
            ),
          },
        },
        existingScores: rawData.existingScores.map((es) => ({
          studentId: es.studentId,
          status: es.status,
          isLocked: es.isLocked,
          remarks: es.remarks,
          componentScores: es.componentScores.map((cs) => ({
            componentId: cs.componentId,
            marksObtained: Number(cs.marksObtained),
            rawScores: cs.rawScores ?? null,
          })),
        })),
        extension: rawData.extension,
        isPublished: rawData.isPublished,
      };
    } else {
      error = !result.success ? result.error : null;
    }
  }

  const selectedSubjectData = selectedSubject
    ? assignedSubjects.find((s) => s.subject.id === selectedSubject.id)
    : null;

  return (
    <div className="min-h-screen">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container max-w-[1600px] mx-auto px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: back + title */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full shrink-0"
                asChild
              >
                <Link href={`/${schoolSlug}/teacher/gradebook`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">
                    {classData.name}
                  </h1>
                  <span className="text-muted-foreground/60 text-xl font-light">/</span>
                  <span className="text-xl font-semibold text-primary">Gradebook</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeTerm ? activeTerm.name : "No active term"}
                  {classData.academicYear?.name && (
                    <span> · {classData.academicYear.name}</span>
                  )}
                  {selectedSubjectData && (
                    <span className="ml-2 font-medium text-foreground/70">
                      — {selectedSubjectData.subject.name}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Right: subject/term selectors */}
            <GradebookToolbar
              schoolSlug={schoolSlug}
              classId={classData.id}
              subjects={assignedSubjects.map((s) => ({
                id: s.subject.id,
                name: s.subject.name,
                code: s.subject.code,
              }))}
              terms={terms.map((t) => ({
                id: t.id,
                name: t.name,
                isCurrent: t.isCurrent,
              }))}
              selectedSubjectId={selectedSubject?.id}
              selectedTermId={selectedTermId}
            />
          </div>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <div className="container max-w-[1600px] mx-auto px-6 py-6">
        {error ? (
          <div className="flex flex-col items-center justify-center h-[500px] text-center">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold">Unable to load gradebook</h3>
            <p className="text-muted-foreground max-w-sm mt-2 text-sm">{error}</p>
            {!selectedSubject && (
              <p className="text-sm mt-4 text-primary">Please select a subject above.</p>
            )}
          </div>
        ) : marksData ? (
          <MarksEntrySheet
            students={marksData.students}
            template={marksData.template}
            existingScores={marksData.existingScores}
            schoolSlug={schoolSlug}
            classId={classData.id}
            subjectId={selectedSubject!.id}
            termId={selectedTermId!}
            extension={marksData.extension}
            isPublished={marksData.isPublished}
            className={classData.name}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-[500px] gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading gradebook…</p>
          </div>
        )}
      </div>
    </div>
  );
}
