import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Users,
  GraduationCap,
} from "lucide-react";
import { formatStudentName } from "@/lib/utils/name-formatter";
import { getActiveSchoolRole } from "@/lib/auth/school-access";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GradebookReviewButton } from "@/components/school/marks/gradebook-review-button";

interface GradebookTrackingPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function GradebookTrackingPage({
  params,
}: GradebookTrackingPageProps) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  const effectiveRole = activeRole?.effectiveRole || "teacher";

  if (
    !["admin", "owner", "headteacher"].includes(effectiveRole) &&
    !session.isSuperAdmin &&
    effectiveRole !== "teacher" // We'll double check HOD status below
  ) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  // If teacher, verify they are an HOD
  const hodDepartmentIds = effectiveRole === "teacher" 
    ? (await prisma.department.findMany({
        where: { headOfDept: { profile: { userId: session.user.id } } },
        select: { id: true }
      })).map(d => d.id)
    : [];

  if (effectiveRole === "teacher" && hodDepartmentIds.length === 0) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  // Get current term
  const currentTerm = await prisma.term.findFirst({
    where: {
      isCurrent: true,
      academicYear: { school: { subdomain: schoolSlug } },
    },
    include: { academicYear: true },
  });

  if (!currentTerm) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Clock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No Active Term Found</h2>
        <p className="text-muted-foreground">
          Please set a current term in Academic Years settings.
        </p>
      </div>
    );
  }

  // Fetch classes, their subjects, teachers, and student counts
  const classes = await prisma.class.findMany({
    where: {
      school: { subdomain: schoolSlug },
      academicYearId: currentTerm.academicYearId,
      ...(hodDepartmentIds.length > 0 ? { departmentId: { in: hodDepartmentIds } } : {}),
    },
    include: {
      subjects: {
        include: {
          subject: true,
          teacher: {
            include: { profile: true },
          },
        },
      },
      _count: {
        select: { students: { where: { status: "ACTIVE" } } },
      },
    },
    orderBy: { name: "asc" },
  });

  // Calculate completion for each subject in each class
  const classStats = await Promise.all(
    classes.map(async (cls) => {
      const studentCount = cls._count.students;

      const subjectStats = await Promise.all(
        cls.subjects.map(async (s) => {
          const [completedScores, firstScore] = await Promise.all([
            prisma.assessmentScore.count({
              where: {
                subjectId: s.subjectId,
                termId: currentTerm.id,
                student: { classId: cls.id, status: "ACTIVE" },
                status: { in: ["SUBMITTED", "REVIEWED", "FINAL"] },
              },
            }),
            prisma.assessmentScore.findFirst({
              where: {
                subjectId: s.subjectId,
                termId: currentTerm.id,
                student: { classId: cls.id, status: "ACTIVE" },
              },
              select: { status: true },
            })
          ]);

          const status = firstScore?.status || "DRAFT";
          const percentage =
            studentCount > 0 ? (completedScores / studentCount) * 100 : 0;

          let teacherNameDisplay = "Unassigned";
          if (s.teacher) {
            if (s.teacher.profile) {
              teacherNameDisplay = formatStudentName(
                s.teacher.profile.firstName,
                s.teacher.profile.lastName,
                s.teacher.profile.otherNames || undefined
              );
            } else {
              teacherNameDisplay =
                formatStudentName(
                  s.teacher.firstName || "",
                  s.teacher.lastName || ""
                ) || "Invited Teacher";
            }
          }

          return {
            id: s.id,
            subjectId: s.subjectId,
            subjectName: s.subject.name,
            teacherName: teacherNameDisplay,
            completed: completedScores,
            total: studentCount,
            percentage: Math.round(percentage),
            status: status as any,
          };
        }),
      );

      const classPercentage =
        subjectStats.length > 0
          ? subjectStats.reduce((acc, curr) => acc + curr.percentage, 0) /
            subjectStats.length
          : 0;

      return {
        id: cls.id,
        name: cls.name,
        subjectStats,
        overallPercentage: Math.round(classPercentage),
      };
    }),
  );

  const totalCompletion =
    classStats.length > 0
      ? classStats.reduce((acc, curr) => acc + curr.overallPercentage, 0) /
        classStats.length
      : 0;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gradebook Completion
          </h1>
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Tracking for {currentTerm.name} ({currentTerm.academicYear.name})
          </p>
        </div>
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Overall School Progress
            </p>
            <p className="text-2xl font-bold text-primary">
              {Math.round(totalCompletion)}%
            </p>
          </div>
          <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {classStats.map((cls) => (
          <Card
            key={cls.id}
            className="overflow-hidden border-primary/10 bg-card/50 backdrop-blur-md hover:shadow-lg transition-all duration-300"
          >
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{cls.name}</CardTitle>
                  <CardDescription>Class completion rate</CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-primary">
                    {cls.overallPercentage}%
                  </span>
                </div>
              </div>
              <Progress value={cls.overallPercentage} className="h-2 mt-4" />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-none">
                    <TableHead className="pl-6">Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cls.subjectStats.map((s) => (
                    <TableRow
                      key={s.id}
                      className="group transition-colors hover:bg-primary/5"
                    >
                      <TableCell className="pl-6 font-medium">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3 w-3 text-muted-foreground" />
                          {s.subjectName}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground italic">
                        {s.teacherName}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] uppercase font-bold px-2 py-0",
                            s.status === "FINAL" || s.status === "REVIEWED" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                            s.status === "SUBMITTED" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                            "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          )}
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-3">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold">
                              {s.percentage}%
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {s.completed}/{s.total}
                            </span>
                          </div>
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                s.status === "FINAL" || s.status === "REVIEWED"
                                  ? "bg-emerald-500"
                                  : s.status === "SUBMITTED"
                                    ? "bg-blue-500"
                                    : "bg-orange-500"
                              }`}
                              style={{ width: `${s.percentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {s.status !== "DRAFT" && (
                          <GradebookReviewButton
                            schoolSlug={schoolSlug}
                            classId={cls.id}
                            subjectId={s.subjectId}
                            termId={currentTerm.id}
                            subjectName={s.subjectName}
                            className={cls.name}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {cls.subjectStats.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-6 text-muted-foreground italic"
                      >
                        No subjects assigned to this class
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
