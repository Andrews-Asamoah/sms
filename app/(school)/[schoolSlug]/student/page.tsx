import { requireSchoolAccess } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BookOpen,
  GraduationCap,
  Home,
  Trophy,
  MessageSquare,
  Bell,
  Calendar,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface StudentDashboardPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function StudentDashboardPage({
  params,
}: StudentDashboardPageProps) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const getCachedSchool = unstable_cache(
    async (slug: string) => {
      return prisma.school.findUnique({
        where: { subdomain: slug },
      });
    },
    [`school-${schoolSlug}`],
    {
      revalidate: 3600, // Cache for 1 hour
      tags: [`school-${schoolSlug}`],
    }
  );

  const school = await getCachedSchool(schoolSlug);

  if (!school) {
    redirect("/");
  }

  const { currentAcademicYearId, currentTermId } = (school.settings as any) || {};

  // Fetch student profile with related information
  const getCachedStudent = unstable_cache(
    async (userId: string, yearId?: string, termId?: string) => {
      return prisma.student.findFirst({
        where: {
          profile: {
            userId: userId,
          },
        },
        include: {
          profile: true,
          department: true,
          enrollments: {
            where: {
              academicYearId: yearId,
              termId: termId || undefined,
              status: "ACTIVE"
            },
            include: {
              class: {
                include: {
                  academicYear: true,
                }
              }
            },
            take: 1
          },
          house: {
            include: {
              houseTeacher: {
                include: {
                  profile: true,
                },
              },
            },
          },
          clubMembers: {
            include: {
              club: true,
            },
          },
          assessmentScores: {
            include: {
              subject: true,
              term: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
          },
        },
      });
    },
    [`student-profile-${session.user.id}`],
    {
      revalidate: 300, // 5 minutes
      tags: [`student-profile-${session.user.id}`],
    }
  );

  const student = await getCachedStudent(session.user.id, currentAcademicYearId, currentTermId);

  if (!student) {
    // If user is a student but no student record exists yet
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold">Welcome, {session.user.name}</h2>
        <p className="text-muted-foreground mt-2">
          Your student profile is being set up. Please contact your
          administrator if this message persists.
        </p>
      </div>
    );
  }

  // Get current active enrollment for class reference
  const currentEnrollment = student.enrollments[0];
  const activeClass = currentEnrollment?.class;

  // Fetch some classmates (same class in current year/term)
  const getCachedClassmates = unstable_cache(
    async (classId: string, yearId?: string, termId?: string, sId?: string) => {
      return prisma.student.findMany({
        where: {
          id: { not: sId },
          status: "ACTIVE",
          enrollments: {
            some: {
              classId: classId,
              academicYearId: yearId,
              termId: termId || undefined,
              status: "ACTIVE"
            }
          }
        },
        include: {
          profile: true,
        },
        take: 4,
      });
    },
    [`student-classmates-${activeClass?.id || 'none'}`],
    {
      revalidate: 300, // 5 minutes
      tags: [`student-classmates-${activeClass?.id || 'none'}`],
    }
  );

  const classmates = activeClass
    ? await getCachedClassmates(activeClass.id, currentAcademicYearId, currentTermId, student.id)
    : [];

  const initials =
    `${student.profile.firstName[0]}${student.profile.lastName[0]}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarFallback className="text-xl bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome, {student.profile.firstName}!
            </h1>
            <p className="text-muted-foreground">
              It's great to have you back. Here's what's happening in your
              school.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-4 py-1 text-sm bg-primary/5">
            {activeClass?.name || "No Class Assigned"}
          </Badge>
          <Badge
            variant="outline"
            className="px-4 py-1 text-sm bg-green-500/5 text-green-600 border-green-200"
          >
            {activeClass?.academicYear?.name || "No Active Year"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Academic & House */}
        <div className="md:col-span-2 space-y-6">
          {/* Quick Stats / Info Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Department
                </CardTitle>
                <BookOpen className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {student.department?.name || "General"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Academics focus area
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">House</CardTitle>
                <Home className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {student.house?.name || "No House"}
                </div>
                {student.house?.motto && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    &quot;{student.house.motto}&quot;
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Assessments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Assessments</CardTitle>
                <CardDescription>
                  Your latest academic performance
                </CardDescription>
              </div>
              <Link href={`/${schoolSlug}/student/grades`}>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {student.assessmentScores.length > 0 ? (
                <div className="space-y-4">
                  {student.assessmentScores.map((score) => (
                    <div
                      key={score.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold">{score.subject.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {score.term.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">
                          {score.percentage.toString()}%
                        </p>
                        <Badge variant="secondary" className="text-[10px] h-4">
                          {score.grade}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No assessment scores recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* School Information */}
          <Card className="bg-primary/[0.02] border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">About {school.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Motto</p>
                  <p className="font-medium italic">
                    &quot;{school.motto || "Excellence in Education"}&quot;
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contact</p>
                  <p className="font-medium">
                    {school.phone || "No contact info"}
                  </p>
                  <p className="text-xs text-muted-foreground underline">
                    {school.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Clubs & Classmates */}
        <div className="space-y-6">
          {/* My Clubs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                My Clubs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {student.clubMembers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {student.clubMembers.map((cm) => (
                    <Badge
                      key={cm.id}
                      variant="secondary"
                      className="bg-primary/5 text-primary border-primary/20"
                    >
                      {cm.club.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You haven't joined any clubs yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Classmates Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">My Classmates</CardTitle>
              <Link href={`/${schoolSlug}/student/classmates`}>
                <Button variant="link" size="sm" className="h-auto p-0">
                  See all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {classmates.length > 0 ? (
                <div className="space-y-4">
                  {classmates.map((classmate) => (
                    <div key={classmate.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px]">
                          {classmate.profile.firstName[0]}
                          {classmate.profile.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {classmate.profile.firstName}{" "}
                        {classmate.profile.lastName}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 text-xs text-center text-muted-foreground border-t">
                    Total {classmates.length + 1} students in your class
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No classmates found.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Communication Links */}
          <div className="grid grid-cols-2 gap-4">
            <Link href={`/${schoolSlug}/student/announcements`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer border-dashed">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <MessageSquare className="h-6 w-6 mb-2 text-primary" />
                  <span className="text-xs font-semibold">Announcements</span>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/${schoolSlug}/student/notifications`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer border-dashed">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <Bell className="h-6 w-6 mb-2 text-orange-500" />
                  <span className="text-xs font-semibold">Notifications</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
