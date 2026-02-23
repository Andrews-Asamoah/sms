import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Users, GraduationCap } from "lucide-react";
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
  const role = getSchoolRole(session, schoolSlug);

  if (
    !["teacher", "admin", "owner"].includes(role?.effectiveRole || "") &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Get Teacher ID
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

  // Get Classes where teacher teaches at least one subject
  // We also want to know WHICH subjects they teach in that class to display count
  const classes = await prisma.class.findMany({
    where: {
      isActive: true,
      school: { subdomain: schoolSlug },
      // Filter by teacher if not admin/owner
      ...(teacherId
        ? {
            subjects: {
              some: {
                subject: {
                  teachers: {
                    some: { teacherId: teacherId },
                  },
                },
              },
            },
          }
        : {}),
    },
    include: {
      _count: {
        select: {
          students: true,
        },
      },
      academicYear: true,
      subjects: {
        include: {
          subject: {
            include: {
              teachers: {
                select: { teacherId: true },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Gradebooks</h1>
        <p className="text-muted-foreground mt-1">
          Select a class to manage marks and assessments
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => {
          // Calculate how many subjects this teacher teaches in this class
          const mySubjectsCount = teacherId
            ? cls.subjects.filter((cs) =>
                cs.subject.teachers.some((t) => t.teacherId === teacherId),
              ).length
            : cls.subjects.length;

          return (
            <Card
              key={cls.id}
              className="flex flex-col hover:border-primary/50 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{cls.name}</CardTitle>
                    <CardDescription>{cls.academicYear.name}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {cls.level}
                  </Badge>
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
                <Button className="w-full" asChild>
                  <Link
                    href={`/${schoolSlug}/teacher/classes/${cls.id}/gradebook`}
                  >
                    Open Gradebook
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {classes.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No classes assigned</h3>
            <p className="text-muted-foreground max-w-sm">
              You haven't been assigned to any subjects yet. Contact your school
              administrator to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
