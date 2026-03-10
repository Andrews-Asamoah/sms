import { requireSchoolAccess } from "@/lib/auth/guards";
import { getActiveSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MonitoringClient } from "./client";
import { ClipboardList } from "lucide-react";

interface MonitoringPageProps {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ termId?: string }>;
}

export default async function MonitoringPage({ params, searchParams }: MonitoringPageProps) {
  const { schoolSlug } = await params;
  const { termId } = await searchParams;

  const session = await requireSchoolAccess(schoolSlug);
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  const effectiveRole = activeRole?.effectiveRole;

  if (effectiveRole !== "admin" && effectiveRole !== "owner" && effectiveRole !== "headteacher" && !session.isSuperAdmin) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, academicYears: { where: { isCurrent: true }, take: 1 } },
  });

  if (!school) redirect("/");

  const currentAcademicYearId = school.academicYears[0]?.id;

  const terms = await prisma.term.findMany({
    where: { academicYearId: currentAcademicYearId },
    orderBy: { startDate: "desc" },
  });

  const selectedTermId = termId || terms.find(t => t.isCurrent)?.id || terms[0]?.id;

  // Fetch all assessment templates for the selected term
  const templates = await prisma.assessmentTemplate.findMany({
    where: { schoolId: school.id },
    include: {
      classes: {
        select: { classId: true }
      },
      assessmentScores: {
        where: { termId: selectedTermId },
        select: {
          id: true,
          studentId: true,
          status: true,
          student: {
            select: { classId: true }
          }
        },
      },
    },
  });

  // Fetch all classes to calculate progress
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id, academicYearId: currentAcademicYearId },
    include: {
      students: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
  });

  // Prepare data for the client component
  const monitoringData = templates.map(template => {
    // Get assigned class IDs for this template
    const assignedClassIds = new Set(template.classes.map((tc: any) => tc.classId));

    // For each template, we want to know progress per class
    const classProgress = classes
      .filter(cls => assignedClassIds.size === 0 || assignedClassIds.has(cls.id)) // Show all if none assigned (fallback) or only assigned
      .map(cls => {
      // Filter scores that belong to students in this class
      const classScores = template.assessmentScores.filter((s: any) => s.student?.classId === cls.id);
      const studentCount = cls.students.length;
      const scoreCount = new Set(classScores.map(s => s.studentId)).size;
      const submittedCount = new Set(classScores.filter(s => s.status !== "DRAFT").map(s => s.studentId)).size;

      return {
        id: cls.id,
        name: cls.name,
        totalStudents: studentCount,
        filledStudents: scoreCount,
        submittedStudents: submittedCount,
        status: scoreCount === 0 ? "NOT_STARTED" : scoreCount === studentCount ? "COMPLETED" : "IN_PROGRESS",
      };
    }).filter(cp => cp.totalStudents > 0);

    return {
      id: template.id,
      name: template.name,
      deadline: template.deadline?.toISOString() || null,
      isLocked: template.isLocked,
      classProgress,
    };
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-primary" />
              Grade Monitoring
            </h1>
            <p className="text-muted-foreground mt-1">
              Track teacher progress and manage grading deadlines
            </p>
          </div>
        </div>

        <MonitoringClient 
          initialData={monitoringData} 
          terms={terms.map(t => ({ id: t.id, name: t.name, isCurrent: t.isCurrent }))}
          selectedTermId={selectedTermId}
          schoolSlug={schoolSlug}
        />
      </div>
    </div>
  );
}
