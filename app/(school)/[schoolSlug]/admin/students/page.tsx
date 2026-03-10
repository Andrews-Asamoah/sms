// app/(school)/[schoolSlug]/admin/students/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Upload,
  Users,
  GraduationCap,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StudentsDataTable } from "@/components/school/students/students-table";
import { columns } from "@/components/school/students/columns";

interface StudentsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function StudentsPage({ params }: StudentsPageProps) {
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

  // Fetch students
  const [rawStudents, activeCount, graduatedCount, withdrawnCount] =
    await Promise.all([
      prisma.student.findMany({
        where: { schoolId: school.id },
        include: {
          profile: {
            include: {
              user: true,
            },
          },
          class: {
            include: {
              academicYear: true,
            },
          },
          department: true,
          house: true,
          _count: {
            select: {
              guardians: true,
              bills: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.student.count({
        where: { schoolId: school.id, status: "ACTIVE" },
      }),
      prisma.student.count({
        where: { schoolId: school.id, status: "GRADUATED" },
      }),
      prisma.student.count({
        where: { schoolId: school.id, status: "WITHDRAWN" },
      }),
    ]);

  // Serialize students to convert Decimal fields to numbers
  const students = rawStudents.map((s) => ({
    ...s,
    outstandingBalance: Number(s.outstandingBalance),
    department: s.department
      ? {
          ...s.department,
          promotionPassMark: s.department.promotionPassMark
            ? Number(s.department.promotionPassMark)
            : null,
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Students Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage student records, enrollments, and information
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/${schoolSlug}/admin/students/credentials`}>
            <Button variant="outline" size="lg">
              <UserCheck className="mr-2 h-5 w-5" />
              Credentials
            </Button>
          </Link>
          <Link href={`/${schoolSlug}/admin/students/bulk-upload`}>
            <Button variant="outline" size="lg">
              <Upload className="mr-2 h-5 w-5" />
              Bulk Upload
            </Button>
          </Link>
          <Link href={`/${schoolSlug}/admin/students/new`}>
            <Button size="lg">
              <Plus className="mr-2 h-5 w-5" />
              New Student
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graduated</CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{graduatedCount}</div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Withdrawn</CardTitle>
            <UserX className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withdrawnCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>View and manage all student records</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentsDataTable
            columns={columns}
            data={students}
            schoolSlug={schoolSlug}
          />
        </CardContent>
      </Card>
    </div>
  );
}
