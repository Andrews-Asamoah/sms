// app/(school)/[schoolSlug]/admin/academic/subjects/[subjectId]/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Users,
  GraduationCap,
  ArrowLeft,
  Edit,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { SubjectDialog } from "@/components/school/subjects/subject-dialog";
import { AssignTeacherDialog } from "@/components/school/subjects/assign-teacher-dialog";
import { RemoveTeacherButton } from "@/components/school/subjects/remove-teacher-button";

interface SubjectDetailPageProps {
  params: Promise<{ schoolSlug: string; subjectId: string }>;
}

export default async function SubjectDetailPage(props: SubjectDetailPageProps) {
  const params = await props.params;
  const { schoolSlug, subjectId } = params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Fetch subject with detailed relationships
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      school: {
        include: {
          organization: true,
          departments: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
          teachers: {
            where: { isActive: true },
            include: {
              profile: true,
            },
            orderBy: {
              profile: {
                firstName: "asc",
              },
            },
          },
        },
      },
      department: true,
      teachers: {
        include: {
          teacher: {
            include: {
              profile: true,
            },
          },
        },
      },
      classSubjects: {
        include: {
          class: {
            include: {
              academicYear: true,
            },
          },
        },
        orderBy: {
          class: {
            level: "asc",
          },
        },
      },
      _count: {
        select: {
          teachers: true,
          classSubjects: true,
          assessmentScores: true,
        },
      },
    },
  });

  if (!subject) {
    notFound();
  }

  // Check if subject belongs to this school
  if (subject.school.subdomain !== schoolSlug) {
    redirect("/");
  }

  // Group class subjects by level
  const classesByLevel = subject.classSubjects.reduce(
    (acc, cs) => {
      const level = cs.class.level;
      if (!acc[level]) {
        acc[level] = [];
      }
      acc[level].push(cs);
      return acc;
    },
    {} as Record<string, typeof subject.classSubjects>,
  );

  // Get available teachers (not already assigned to this subject)
  const availableTeachers = subject.school.teachers.filter(
    (t) => !subject.teachers.some((st) => st.teacherId === t.id),
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-muted/30 to-muted/50">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href={`/${schoolSlug}/admin/academic/subjects`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {subject.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Subject Code: {subject.code} • {subject.department.name}
            </p>
          </div>
          <SubjectDialog
            schoolId={subject.schoolId}
            schoolSlug={schoolSlug}
            organizationId={subject.school.organizationId}
            departments={subject.school.departments}
            initialData={subject}
          >
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Subject
            </Button>
          </SubjectDialog>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Assigned Teachers
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subject._count.teachers}
              </div>
              <p className="text-xs text-muted-foreground">
                Active assignments
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Classes</CardTitle>
              <GraduationCap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subject._count.classSubjects}
              </div>
              <p className="text-xs text-muted-foreground">
                Teaching this subject
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Assessment Records
              </CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subject._count.assessmentScores}
              </div>
              <p className="text-xs text-muted-foreground">Total scores</p>
            </CardContent>
          </Card>
        </div>

        {/* Subject Details */}
        <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
          <CardHeader>
            <CardTitle>Subject Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Subject Name
                </p>
                <p className="text-lg font-semibold">{subject.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Subject Code
                </p>
                <p className="text-lg font-semibold">{subject.code}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Department
                </p>
                <p className="text-lg font-semibold">
                  {subject.department.name}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Credit Hours
                </p>
                <p className="text-lg font-semibold">{subject.creditHours}</p>
              </div>
            </div>
            {subject.description && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Description
                  </p>
                  <p className="text-sm">{subject.description}</p>
                </div>
              </>
            )}
            <Separator />
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Status:
              </p>
              <Badge variant={subject.isActive ? "default" : "secondary"}>
                {subject.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Teachers */}
        <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Assigned Teachers</CardTitle>
                <CardDescription>
                  Teachers currently assigned to teach this subject
                </CardDescription>
              </div>
              <AssignTeacherDialog
                subjectId={subject.id}
                subjectName={subject.name}
                schoolSlug={schoolSlug}
                availableTeachers={availableTeachers}
              >
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign Teacher
                </Button>
              </AssignTeacherDialog>
            </div>
          </CardHeader>
          <CardContent>
            {subject.teachers.length === 0 ? (
              <div className="text-center py-8 rounded-lg border-2 border-dashed">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No teachers assigned yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {subject.teachers.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-background/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {st.teacher.profile.firstName}{" "}
                          {st.teacher.profile.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Teacher ID: {st.teacher.teacherId}
                        </p>
                      </div>
                    </div>
                    <RemoveTeacherButton
                      subjectTeacherId={st.id}
                      teacherName={`${st.teacher.profile.firstName} ${st.teacher.profile.lastName}`}
                      subjectName={subject.name}
                      schoolSlug={schoolSlug}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Classes Teaching This Subject */}
        <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
          <CardHeader>
            <CardTitle>Classes</CardTitle>
            <CardDescription>
              Classes where this subject is taught
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subject.classSubjects.length === 0 ? (
              <div className="text-center py-8 rounded-lg border-2 border-dashed">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Not assigned to any classes yet
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(classesByLevel).map(([level, classes]) => (
                  <div key={level} className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase">
                      {level}
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {classes.map((cs) => (
                        <div
                          key={cs.id}
                          className="p-4 rounded-lg border bg-background/50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{cs.class.name}</p>
                            <Badge
                              variant={cs.isCompulsory ? "default" : "outline"}
                            >
                              {cs.isCompulsory ? "Compulsory" : "Elective"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {cs.class.academicYear.name}
                            {cs.class.section &&
                              ` • Section ${cs.class.section}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
