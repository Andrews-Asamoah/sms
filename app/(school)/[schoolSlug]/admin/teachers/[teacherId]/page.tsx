import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  User,
  BookOpen,
  GraduationCap,
  MapPin,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { AssignTeacherSheet } from "@/components/school/teachers/assign-teacher-sheet";
import { BanUserButton } from "@/components/school/ban-user-button";
import { DynamicBreadcrumb } from "@/components/shared/dynamic-breadcrumb";

interface TeacherDetailPageProps {
  params: Promise<{ schoolSlug: string; teacherId: string }>;
}

export default async function TeacherDetailPage({
  params,
}: TeacherDetailPageProps) {
  const { schoolSlug, teacherId } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      profile: {
        include: {
          user: true,
        },
      },
      department: true,
      house: true,
      subjects: {
        include: {
          subject: true,
        },
      },
      classesAsClassTeacher: {
        include: {
          academicYear: true,
        },
      },
      school: true,
    },
  });

  if (!teacher || teacher.school.subdomain !== schoolSlug || !teacher.profile) {
    notFound();
  }

  // Fetch metadata for assignments
  const [allSubjects, departments, houses] = await Promise.all([
    prisma.subject.findMany({
      where: { schoolId: teacher.schoolId, isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { schoolId: teacher.schoolId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.house.findMany({
      where: { schoolId: teacher.schoolId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const profile = teacher.profile;

  const initials =
    `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-6">
      <DynamicBreadcrumb label={`${profile.firstName} ${profile.lastName}`} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/${schoolSlug}/admin/teachers`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Teacher Details
            </h1>
            <p className="text-muted-foreground text-sm">
              View information for {profile.firstName} {profile.lastName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BanUserButton
            schoolSlug={schoolSlug}
            userId={profile.userId}
            isBanned={profile.user?.banned ?? false}
            userName={`${profile.firstName} ${profile.lastName}`}
          />
          <AssignTeacherSheet
            schoolSlug={schoolSlug}
            teacher={teacher}
            departments={departments}
            houses={houses}
            allSubjects={allSubjects}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile.user?.image || undefined} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background ${teacher.isActive ? "bg-green-500" : "bg-gray-400"}`}
              />
            </div>
            <CardTitle>
              {profile.firstName} {profile.lastName}
            </CardTitle>
            <CardDescription className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="secondary" className="font-mono text-xs">
                {teacher.teacherId}
              </Badge>
              {teacher.staffNumber && (
                <Badge variant="outline" className="font-mono text-xs">
                  {teacher.staffNumber}
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    {teacher.department.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Department</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-foreground capitalize">
                    {teacher.employmentType.replace("_", " ").toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Employment Type
                  </p>
                </div>
              </div>

              {profile.user?.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="overflow-hidden">
                    <p
                      className="font-medium text-foreground truncate"
                      title={profile.user.email}
                    >
                      {profile.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">Email</p>
                  </div>
                </div>
              )}

              {profile.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">
                      {profile.phone}
                    </p>
                    <p className="text-xs text-muted-foreground">Phone</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    {format(new Date(teacher.hireDate), "MMM dd, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">Hired Date</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Details Tabs */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="academic">Academic</TabsTrigger>
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-500" />
                      Assigned Subjects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {teacher.subjects.length > 0 ? (
                      <div className="space-y-4">
                        {teacher.subjects.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {st.subject.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {st.subject.code}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {st.subject.periodsPerWeek} periods/wk
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        No subjects assigned yet.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-purple-500" />
                      Class Teacher
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {teacher.classesAsClassTeacher.length > 0 ? (
                      <div className="space-y-4">
                        {teacher.classesAsClassTeacher.map((cls) => (
                          <div
                            key={cls.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                          >
                            <div>
                              <p className="font-medium text-sm">{cls.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {cls.level}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {cls.academicYear.name}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        Not assigned as class teacher.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Professional Info</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Qualification</p>
                    <p className="font-medium">
                      {teacher.qualification || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Specialization</p>
                    <p className="font-medium">
                      {teacher.specialization || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Experience</p>
                    <p className="font-medium">
                      {teacher.experience
                        ? `${teacher.experience} years`
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">House</p>
                    <p className="font-medium">
                      {teacher.house ? teacher.house.name : "Not assigned"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="academic" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Academic Assignments</CardTitle>
                  <CardDescription>
                    Detailed view of academic responsibilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-10 text-muted-foreground">
                    <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>Timeline/Schedule view coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="personal" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Private personal details</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-8 gap-y-6 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Full Name</p>
                    <p className="font-medium">
                      {profile.firstName} {profile.otherNames}{" "}
                      {profile.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Date of Birth</p>
                    <p className="font-medium">
                      {format(new Date(profile.dateOfBirth), "MMMM dd, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Gender</p>
                    <p className="font-medium capitalize">
                      {profile.gender.toLowerCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Nationality</p>
                    <p className="font-medium">
                      {profile.nationality || "Ghanaian"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">
                      Contract End Date
                    </p>
                    <p className="font-medium">
                      {teacher.contractEndDate
                        ? format(
                            new Date(teacher.contractEndDate),
                            "MMM dd, yyyy",
                          )
                        : "Indefinite"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
