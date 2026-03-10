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
          })),
        })),
        extension: rawData.extension,
        isPublished: rawData.isPublished,
      };
    } else {
      error = !result.success ? result.error : null;
    }
  }

  return (
    <div className="container py-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/${schoolSlug}/teacher/gradebook`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {classData.name} Gradebook
            </h1>
            <p className="text-muted-foreground text-sm">
              {activeTerm ? activeTerm.name : "No Term"} •{" "}
              {classData.academicYear?.name || "No Academic Year"}
            </p>
          </div>
        </div>

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

      {/* Content Area */}
      <div className="bg-card rounded-xl border shadow-sm min-h-[600px]">
        {error ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center p-8">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground">
              Unable to load gradebook
            </h3>
            <p className="text-muted-foreground max-w-sm mt-2">{error}</p>
            {!selectedSubject && (
              <p className="text-sm mt-4 text-blue-600">
                Please select a subject.
              </p>
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
          />
        ) : (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
