// app/(school)/[schoolSlug]/admin/classes/[classId]/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
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
import { notFound } from "next/navigation";
import { ClassForm } from "@/components/forms/class-form";

interface EditClassPageProps {
  params: Promise<{ schoolSlug: string; classId: string }>;
}

export default async function EditClassPage(props: EditClassPageProps) {
  const params = await props.params;
  const { schoolSlug, classId } = params;

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

  // Fetch school
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
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
  });

  if (!school) {
    redirect("/");
  }

  // Fetch class
  const classItem = await prisma.class.findUnique({
    where: {
      id: classId,
      schoolId: school.id,
    },
    include: {
      academicYear: true,
      classTeacher: {
        include: {
          profile: true,
        },
      },
      _count: {
        select: {
          students: true,
          subjects: true,
        },
      },
    },
  });

  if (!classItem) {
    notFound();
  }

  // Get all academic years
  const allAcademicYears = await prisma.academicYear.findMany({
    where: { schoolId: school.id },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="space-y-6 p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/${schoolSlug}/admin/classes`}>
            <Button
              variant="outline"
              size="icon"
              className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Edit Class
            </h1>
            <p className="text-muted-foreground mt-1">
              Update class information for {classItem.name}
            </p>
          </div>
        </div>

        {/* Stats Card */}
        <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">Current Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">
                  {classItem._count.students}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subjects</p>
                <p className="text-2xl font-bold">
                  {classItem._count.subjects}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="text-2xl font-bold">
                  {classItem.capacity || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-bold">
                  {classItem.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl">
          <CardHeader>
            <CardTitle>Class Information</CardTitle>
            <CardDescription>Update the class details below</CardDescription>
          </CardHeader>
          <CardContent>
            <ClassForm
              schoolId={school.id}
              schoolSlug={schoolSlug}
              academicYears={allAcademicYears}
              teachers={school.teachers}
              initialData={classItem}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
