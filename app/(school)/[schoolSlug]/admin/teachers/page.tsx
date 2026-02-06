// app/(school)/[schoolSlug]/admin/teachers/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus, Users, GraduationCap, Home } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TeachersDataTable } from "@/components/school/teachers/teachers-table";
import { columns } from "@/components/school/teachers/columns";
import { TeacherDialog } from "@/components/school/teachers/teacher-dialog";

interface TeachersPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function TeachersPage({ params }: TeachersPageProps) {
  const { schoolSlug } = await params;

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
  });

  if (!school) {
    redirect("/");
  }

  // Fetch teachers with related data
  const [teachers, activeCount, departments, houses] = await Promise.all([
    prisma.teacher.findMany({
      where: { schoolId: school.id },
      include: {
        profile: true,
        department: true,
        house: true,
        _count: {
          select: {
            subjects: true,
            classesAsClassTeacher: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.teacher.count({
      where: { schoolId: school.id, isActive: true },
    }),
    prisma.department.findMany({
      where: { schoolId: school.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.house.findMany({
      where: { schoolId: school.id, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalTeachers = teachers.length;
  const inactiveCount = totalTeachers - activeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Teachers Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage teaching staff, assignments, and qualifications
          </p>
        </div>
        <TeacherDialog
          schoolId={school.id}
          schoolSlug={schoolSlug}
          departments={departments}
          houses={houses}
        >
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Teacher
          </Button>
        </TeacherDialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Teachers
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeachers}</div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Teachers
            </CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Teachers
            </CardTitle>
            <Home className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Teachers Table */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <CardDescription>
            View and manage all teaching staff and their assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeachersDataTable
            columns={columns}
            data={teachers}
            schoolSlug={schoolSlug}
            departments={departments}
            houses={houses}
          />
        </CardContent>
      </Card>
    </div>
  );
}
