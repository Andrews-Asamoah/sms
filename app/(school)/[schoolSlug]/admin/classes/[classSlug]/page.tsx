// app/(school)/[schoolSlug]/admin/classes/[classId]/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClassForm } from "@/components/forms/class-form";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassSubjectsTab } from "@/components/school/classes/class-subjects-tab";
import { ClassStudentsTab } from "@/components/school/classes/class-students-tab";
import { BookOpen, Users, Settings } from "lucide-react";

interface EditClassPageProps {
  params: Promise<{ schoolSlug: string; classSlug: string }>;
}

export default async function EditClassPage({ params }: EditClassPageProps) {
  const { schoolSlug, classSlug } = await params;

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

  // Fetch school with academic years, teachers, and ALL available subjects
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      academicYears: {
        orderBy: { startDate: "desc" },
      },
      departments: {
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
      subjects: {
        where: { isActive: true },
        select: { id: true, name: true, code: true },
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
      classes: {
        select: {
          id: true,
          name: true,
          level: true,
        },
        orderBy: [
          { level: "asc" },
          { name: "asc" },
        ],
      },
    },
  });

  if (!school) {
    redirect("/");
  }

  // Fetch the class with its current subjects and enrolled students
  const classData = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      schoolId: school.id,
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
      students: {
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
  });

  if (!classData) {
    notFound();
  }

  // Fetch all active students not already enrolled in this class.
  // This includes students with no class AND students currently in a different class.
  const otherStudents = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      status: "ACTIVE",
      OR: [
        { classId: null },
        { classId: { not: classData.id } }
      ]
    },
    include: {
      profile: true,
      class: { select: { name: true } },
    },
    orderBy: {
      profile: { firstName: "asc" },
    },
  });

  // Serialize students to convert Decimal fields (outstandingBalance) to numbers for Client Components
  const serializedClassStudents = classData.students.map((s) => ({
    ...s,
    outstandingBalance: Number(s.outstandingBalance),
  }));

  // Split into unassigned (no class) and students who need to be moved from another class
  const unassignedStudents = otherStudents
    .filter((s) => !s.classId)
    .map((s) => ({
      ...s,
      outstandingBalance: Number(s.outstandingBalance),
    }));

  const studentsInOtherClasses = otherStudents
    .filter((s) => s.classId !== null)
    .map((s) => ({
      ...s,
      currentClassName: s.class?.name ?? null,
      outstandingBalance: Number(s.outstandingBalance),
    }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${schoolSlug}/admin/classes`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {classData.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage class details and assignments
          </p>
        </div>
      </div>

      <Tabs defaultValue="subjects" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="subjects" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Subjects
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="subjects"
          className="animate-in fade-in-50 duration-300"
        >
          <ClassSubjectsTab
            schoolSlug={schoolSlug}
            classId={classData.id}
            level={classData.level}
            academicYearId={classData.academicYearId}
            currentSubjects={classData.subjects as any}
            allSubjects={school.subjects}
            schoolTeachers={school.teachers
              .filter((t) => t.profile !== null)
              .map((t) => ({
                id: t.id,
                profile: {
                  firstName: t.profile!.firstName,
                  lastName: t.profile!.lastName,
                },
              }))}
          />
        </TabsContent>

        <TabsContent
          value="students"
          className="animate-in fade-in-50 duration-300"
        >
          <ClassStudentsTab
            schoolSlug={schoolSlug}
            classId={classData.id}
            students={serializedClassStudents as any}
            unassignedStudents={unassignedStudents as any}
            studentsInOtherClasses={studentsInOtherClasses as any}
          />
        </TabsContent>

        <TabsContent
          value="settings"
          className="animate-in fade-in-50 duration-300"
        >
          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Class Information</CardTitle>
              <CardDescription>
                Update basic details for {classData.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClassForm
                schoolId={school.id}
                schoolSlug={schoolSlug}
                organizationId={school.organizationId}
                academicYears={school.academicYears}
                teachers={school.teachers
                  .filter((t) => t.profile !== null)
                  .map((t) => ({
                    id: t.id,
                    profile: {
                      firstName: t.profile!.firstName,
                      lastName: t.profile!.lastName,
                    },
                  }))}
                departments={school.departments}
                initialData={{
                  id: classData.id,
                  name: classData.name,
                  level: classData.level,
                  section: classData.section,
                  capacity: classData.capacity,
                  academicYearId: classData.academicYearId,
                  classTeacherId: classData.classTeacherId,
                  departmentId: classData.departmentId,
                  isActive: classData.isActive,
                  isGraduatingClass: classData.isGraduatingClass,
                  order: classData.order,
                  nextPromotionClassId: classData.nextPromotionClassId,
                }}
                classes={school.classes}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
