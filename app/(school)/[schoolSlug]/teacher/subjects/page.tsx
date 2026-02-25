import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface SubjectsPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function TeacherSubjectsPage({
  params,
}: SubjectsPageProps) {
  const { schoolSlug } = await params;

  // 1. Auth check
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  // 2. Get Teacher ID
  let teacherId: string | undefined;

  if (role?.effectiveRole === "teacher") {
    const teacher = await prisma.teacher.findFirst({
      where: {
        school: { subdomain: schoolSlug },
        profile: { userId: session.user.id },
      },
      select: { id: true },
    });
    teacherId = teacher?.id;
  }

  // 3. Fetch School for ID
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) notFound();

  // 4. Fetch Assigned Subjects
  const classSubjects = await prisma.classSubject.findMany({
    where: {
      class: { schoolId: school.id },
      ...(teacherId
        ? { teacherId }
        : !session.isSuperAdmin &&
            role?.effectiveRole !== "admin" &&
            role?.effectiveRole !== "owner"
          ? { id: "none" }
          : {}),
    },
    include: {
      subject: true,
      class: {
        include: {
          _count: {
            select: { students: true },
          },
        },
      },
    },
    orderBy: {
      subject: { name: "asc" },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Subjects</h1>
        <p className="text-muted-foreground">
          View all subjects you are assigned to teach across your classes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classSubjects.map((cs) => (
          <Card
            key={cs.id}
            className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="mb-2 uppercase text-[10px]">
                  {cs.subject.code}
                </Badge>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">{cs.subject.name}</CardTitle>
              <CardDescription>{cs.class.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{cs.class._count.students} Students</span>
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs gap-1"
                  asChild
                >
                  <Link
                    href={`/${schoolSlug}/teacher/classes/${cs.class.slug || cs.class.id}/gradebook`}
                  >
                    <GraduationCap className="h-3 w-3" />
                    Gradebook
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1"
                  asChild
                >
                  <Link
                    href={`/${schoolSlug}/teacher/classes/${cs.class.slug || cs.class.id}/students`}
                  >
                    <Users className="h-3 w-3" />
                    Students
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {classSubjects.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-lg font-medium">No Subjects Assigned</h3>
            <p className="text-muted-foreground">
              You are not currently assigned to teach any subjects.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
