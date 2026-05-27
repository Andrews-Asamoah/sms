import { requireSchoolAccess } from "@/lib/auth/guards";
import { getActiveSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Users, GraduationCap, CheckCircle2, Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TeacherGradebookPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function TeacherGradebookPage({
  params,
}: TeacherGradebookPageProps) {
  const { schoolSlug } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  const effectiveRole = activeRole?.effectiveRole || "teacher";

  if (
    !["teacher", "admin", "owner", "headteacher"].includes(effectiveRole) &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  // Get Teacher ID
  const teacher = await prisma.teacher.findFirst({
    where: {
      school: { subdomain: schoolSlug },
      profile: { userId: session.user.id },
    },
    select: { id: true },
  });
  const teacherId = teacher?.id;

  // Get the current term
  const currentTerm = await prisma.term.findFirst({
    where: { isCurrent: true, academicYear: { school: { subdomain: schoolSlug } } },
    select: { id: true, name: true },
  });

  // Get Classes where teacher teaches at least one subject (only for current/active year)
  const classes = await prisma.class.findMany({
    where: {
      isActive: true,
      school: { subdomain: schoolSlug },
      academicYear: { isCurrent: true },
      // Filter by teacher if not admin/owner
      ...(teacherId && effectiveRole === "teacher"
        ? { subjects: { some: { teacherId } } }
        : {}),
    },
    include: {
      _count: { select: { students: true } },
      academicYear: { select: { name: true } },
      subjects: {
        where: teacherId ? { teacherId } : {},
        include: { subject: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  // For each class + current term, check if a published report card set exists
  // and check if all submitted marks exist 
  let publishedClassIds = new Set<string>();
  let allScoresSubmittedByClass = new Map<string, boolean>();

  if (currentTerm && classes.length > 0) {
    const classIds = classes.map((c) => c.id);

    const [publishedSets, submittedStats] = await Promise.all([
      // Report card sets that are published for any of these classes in the current term
      prisma.reportCardSet.findMany({
        where: {
          termId: currentTerm.id,
          status: "PUBLISHED",
          OR: [
            { classId: { in: classIds } },
            { targetClasses: { some: { classId: { in: classIds } } } },
          ],
        },
        select: {
          classId: true,
          targetClasses: { select: { classId: true } },
        },
      }),
      // Check per-class whether all student scores are SUBMITTED/FINAL for the current term
      teacherId
        ? prisma.class.findMany({
            where: { id: { in: classIds } },
            select: {
              id: true,
              subjects: {
                where: { teacherId },
                select: { subjectId: true },
              },
              students: {
                where: { status: "ACTIVE" },
                select: {
                  assessmentScores: {
                    where: {
                      termId: currentTerm.id,
                      status: { in: ["SUBMITTED", "FINAL"] },
                    },
                    select: { id: true, subjectId: true },
                  },
                },
              },
              _count: { select: { students: { where: { status: "ACTIVE" } } } },
            },
          })
        : Promise.resolve([]),
    ]);

    // Build set of published class IDs
    for (const ps of publishedSets) {
      if (ps.classId) publishedClassIds.add(ps.classId);
      for (const tc of ps.targetClasses) {
        publishedClassIds.add(tc.classId);
      }
    }

    // Determine if all marks submitted per class
    if (Array.isArray(submittedStats)) {
      for (const cls of submittedStats) {
        const totalActive = cls._count.students;
        if (totalActive === 0) continue;
        const teacherSubjectIds = cls.subjects.map((s) => s.subjectId);
        if (teacherSubjectIds.length === 0) {
          allScoresSubmittedByClass.set(cls.id, false);
          continue;
        }
        const allSubmitted = cls.students.every((s) => {
          const submittedSubjectIds = s.assessmentScores.map((score) => score.subjectId);
          return teacherSubjectIds.every((id) => submittedSubjectIds.includes(id));
        });
        allScoresSubmittedByClass.set(cls.id, allSubmitted);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Gradebooks</h1>
        <p className="text-muted-foreground mt-1">
          {currentTerm ? `Current Term: ${currentTerm.name} · ` : ""}
          Select a class to manage marks and assessments
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => {
          const mySubjectsCount = cls.subjects.length;
          const isPublished = publishedClassIds.has(cls.id);
          const isCompleted = allScoresSubmittedByClass.get(cls.id) === true;

          // If published, hide from teacher dashboard per the requirement
          // (report says "should disappear from their dashboard" once published)
          if (isPublished) return null;

          return (
            <Card
              key={cls.id}
              className={`flex flex-col transition-colors ${
                isCompleted
                  ? "border-green-500/40 bg-green-500/5"
                  : "hover:border-primary/50"
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {cls.name}
                      {isCompleted && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </CardTitle>
                    <CardDescription>{cls.academicYear.name}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="font-mono">
                      {(cls as any).level}
                    </Badge>
                    {isCompleted && (
                      <Badge className="bg-green-500/10 text-green-700 border-green-200 text-[10px]">
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{cls._count.students} Students</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>
                    {mySubjectsCount} Subject{mySubjectsCount !== 1 ? "s" : ""}{" "}
                    assigned
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full ${isCompleted ? "bg-green-600 hover:bg-green-700" : ""}`}
                  asChild
                >
                  <Link
                    href={`/${schoolSlug}/teacher/classes/${(cls as any).slug || cls.id}/gradebook`}
                  >
                    {isCompleted ? "View Gradebook" : "Open Gradebook"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {classes.filter((cls) => !publishedClassIds.has(cls.id)).length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No active gradebooks</h3>
            <p className="text-muted-foreground max-w-sm">
              {classes.length > 0
                ? "All report cards for your classes have been published."
                : "You haven't been assigned to any subjects yet. Contact your school administrator to get started."}
            </p>
          </div>
        )}
      </div>

      {/* Show published (completed + locked) classes separately */}
      {publishedClassIds.size > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Published & Locked
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes
              .filter((cls) => publishedClassIds.has(cls.id))
              .map((cls) => (
                <Card
                  key={cls.id}
                  className="flex flex-col opacity-60 border-muted"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{cls.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" />
                        Published
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardFooter className="pt-0">
                    <Button variant="outline" className="w-full" size="sm" asChild>
                      <Link
                        href={`/${schoolSlug}/teacher/classes/${(cls as any).slug || cls.id}/gradebook`}
                      >
                        View (Read-only)
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
