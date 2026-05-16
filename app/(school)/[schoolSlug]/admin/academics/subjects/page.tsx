import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SubjectsClient } from "./client";
import { SubjectDialog } from "@/components/school/subjects/subject-dialog";
import { BookOpen, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SubjectsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function SubjectsPage(props: SubjectsPageProps) {
  const params = await props.params;
  const { schoolSlug } = params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    redirect("/");
  }

  // Fetch subjects with relations
  const rawSubjects = await prisma.subject.findMany({
    where: { schoolId: school.id },
    include: {
      departments: {
        select: {
          id: true,
          name: true,
        },
      },
      classSubjects: {
        where: { teacherId: { not: null } },
        select: { teacherId: true },
      },
      _count: {
        select: {
          classSubjects: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Calculate unique assigned teachers per subject
  const subjects = rawSubjects.map((subject) => {
    const uniqueTeacherIds = new Set(
      subject.classSubjects.map((cs) => cs.teacherId).filter(Boolean)
    );
    
    // Strip out classSubjects array before passing to the client to keep payload small
    const { classSubjects, ...rest } = subject;
    
    return {
      ...rest,
      _count: {
        ...rest._count,
        teachers: uniqueTeacherIds.size,
      },
    };
  });

  // Fetch departments for the add dialog
  const departments = await prisma.department.findMany({
    where: { schoolId: school.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Fetch active teachers for the bulk assign dialog
  const teachers = await prisma.teacher.findMany({
    where: { schoolId: school.id, isActive: true },
    include: { profile: true },
    orderBy: { profile: { firstName: "asc" } },
  });
  
  const mappedTeachers = teachers
    .filter((t) => t.profile !== null)
    .map((t) => ({
      id: t.id,
      profile: {
        firstName: t.profile!.firstName,
        lastName: t.profile!.lastName,
      },
    }));

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              Subjects
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage subjects and curriculum details
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/${schoolSlug}/admin/academics/subjects/bulk-upload`}>
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload
              </Link>
            </Button>
            <SubjectDialog schoolSlug={schoolSlug} departments={departments} />
          </div>
        </div>

        <div className="bg-background rounded-lg border shadow-sm p-4">
          <SubjectsClient
            data={subjects}
            schoolSlug={schoolSlug}
            departments={departments}
            teachers={mappedTeachers}
          />
        </div>
      </div>
    </div>
  );
}
