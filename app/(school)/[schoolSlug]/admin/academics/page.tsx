// app/(school)/[schoolSlug]/admin/academic/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  BookOpen,
  Building2,
  GraduationCap,
  Calendar,
  Users,
  FileText,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AcademicOverviewPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AcademicOverviewPage(
  props: AcademicOverviewPageProps,
) {
  const params = await props.params;
  const { schoolSlug } = params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  // Check authorization
  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Fetch data directly from database
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      subjects: {
        where: { isActive: true },
      },
      departments: {
        where: { isActive: true },
        include: {
          headOfDept: {
            include: {
              profile: true,
            },
          },
          _count: {
            select: {
              subjects: true,
              teachersInDepartment: true,
            },
          },
        },
      },
      academicYears: {
        include: {
          terms: true,
          _count: {
            select: {
              classes: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
        take: 5,
      },
      gradingSystems: {
        where: { isActive: true },
      },
      _count: {
        select: {
          students: true,
          teachers: true,
          classes: true,
        },
      },
    },
  });

  if (!school) {
    redirect("/");
  }

  // Get current academic year and term from settings
  interface SchoolSettings {
    currentAcademicYearId?: string;
    currentTermId?: string;
  }

  const settings = (school.settings as SchoolSettings) || {};
  const currentYear = school.academicYears.find(
    (year) => year.id === settings.currentAcademicYearId,
  );
  const currentTerm = currentYear?.terms.find(
    (term) => term.id === settings.currentTermId,
  );

  const stats = {
    subjects: school.subjects.length,
    departments: school.departments.length,
    teachers: school._count.teachers,
    students: school._count.students,
    classes: school._count.classes,
    academicYears: school.academicYears.length,
    gradingSystems: school.gradingSystems.length,
  };

  const topDepartments = school.departments.slice(0, 5).map((dept) => ({
    id: dept.id,
    name: dept.name,
    subjectsCount: dept._count.subjects,
    teachersCount: dept._count.teachersInDepartment,
    headOfDept: dept.headOfDept
      ? {
          id: dept.headOfDept.id,
          firstName: dept.headOfDept.profile.firstName,
          lastName: dept.headOfDept.profile.lastName,
        }
      : null,
  }));

  const recentAcademicYears = school.academicYears.slice(0, 5).map((year) => ({
    id: year.id,
    name: year.name,
    termsCount: year.terms.length,
    classesCount: year._count.classes,
    isCurrent: year.id === settings.currentAcademicYearId,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-muted/50">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Academic Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage curriculum, subjects, departments, and academic structure
            </p>
          </div>
        </div>

        {/* Current Academic Period */}
        {currentYear && (
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-xl shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Current Academic Period
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Active academic year and term for all operations
                  </CardDescription>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/${schoolSlug}/admin/academic-years`}>
                    Manage Periods
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Academic Year
                  </p>
                  <p className="text-2xl font-bold">{currentYear.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(currentYear.startDate).toLocaleDateString()} -{" "}
                    {new Date(currentYear.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Current Term
                  </p>
                  <p className="text-2xl font-bold">
                    {currentTerm?.name || "Not Set"}
                  </p>
                  {currentTerm && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(currentTerm.startDate).toLocaleDateString()} -{" "}
                      {new Date(currentTerm.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.subjects}</div>
              <p className="text-xs text-muted-foreground">Active subjects</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.departments}</div>
              <p className="text-xs text-muted-foreground">
                Academic departments
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teachers</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.teachers}</div>
              <p className="text-xs text-muted-foreground">Teaching staff</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Classes</CardTitle>
              <GraduationCap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.classes}</div>
              <p className="text-xs text-muted-foreground">Active classes</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Subjects Management */}
          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <BookOpen className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="mt-4">Subjects</CardTitle>
              <CardDescription>
                Manage curriculum subjects and teacher assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="outline">
                <Link href={`/${schoolSlug}/admin/academics/subjects`}>
                  Manage Subjects
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Departments */}
          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Building2 className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="mt-4">Departments</CardTitle>
              <CardDescription>
                Organize subjects into academic departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="outline">
                <Link href={`/${schoolSlug}/admin/academics/departments`}>
                  Manage Departments
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Grading Systems */}
          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <TrendingUp className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="mt-4">Grading Systems</CardTitle>
              <CardDescription>
                Configure grading scales and assessment criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="outline">
                <Link href={`/${schoolSlug}/admin/academics/grading`}>
                  Manage Grading
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Academic Years */}
          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Calendar className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="mt-4">Academic Years & Terms</CardTitle>
              <CardDescription>
                Manage academic calendar and term periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="outline">
                <Link href={`/${schoolSlug}/admin/academic-years`}>
                  Manage Calendar
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Examinations */}
          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <FileText className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="mt-4">Examinations</CardTitle>
              <CardDescription>
                Schedule and manage examinations and assessments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="outline">
                <Link href={`/${schoolSlug}/admin/academics/examinations`}>
                  Manage Exams
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity / Quick Info */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Departments */}
          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader>
              <CardTitle>Top Departments</CardTitle>
              <CardDescription>By subject count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topDepartments.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{dept.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {dept.subjectsCount} subjects • {dept.teachersCount}{" "}
                        teachers
                      </p>
                    </div>
                    {dept.headOfDept && (
                      <Badge variant="outline">
                        HOD: {dept.headOfDept.firstName}{" "}
                        {dept.headOfDept.lastName}
                      </Badge>
                    )}
                  </div>
                ))}
                {topDepartments.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No departments created yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Academic Years */}
          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader>
              <CardTitle>Recent Academic Years</CardTitle>
              <CardDescription>Latest academic periods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAcademicYears.map((year) => (
                  <div
                    key={year.id}
                    className="flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{year.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {year.termsCount} terms • {year.classesCount} classes
                      </p>
                    </div>
                    <Badge variant={year.isCurrent ? "default" : "outline"}>
                      {year.isCurrent ? "Current" : "Past"}
                    </Badge>
                  </div>
                ))}
                {recentAcademicYears.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No academic years created yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
