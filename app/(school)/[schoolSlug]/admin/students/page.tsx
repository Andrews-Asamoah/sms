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
  UserCog,
  ImageUp,
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
import { PurgeStudentsButton } from "@/components/school/students/purge-students-button";
import { StudentClassFilter } from "@/components/school/students/student-class-filter";
import { StatCard } from "@/components/ui/stat-card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface StudentsPageProps {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StudentsPage({
  params,
  searchParams,
}: StudentsPageProps) {
  const { schoolSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const classId = resolvedSearchParams.classId as string | undefined;

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

  // Fetch students stats
  const [totalCount, activeCount, graduatedCount, withdrawnCount] =
    await Promise.all([
      prisma.student.count({
        where: { schoolId: school.id },
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

  // Fetch all classes for the filter dropdown
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const effectiveClassId = classId || "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Students Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage student records, enrollments, and information
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" asChild>
              <Link href={`/${schoolSlug}/admin/students/credentials`}>
                <UserCog className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Credentials</span>
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/${schoolSlug}/admin/students/bulk-upload`}>
                <Upload className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Bulk Upload</span>
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/${schoolSlug}/admin/students/bulk-images`}>
                <ImageUp className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Bulk Photos</span>
              </Link>
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white" asChild>
              <Link href={`/${schoolSlug}/admin/students/new`}>
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Student</span>
              </Link>
            </Button>
          </div>
          {(role?.effectiveRole === "owner" || session.isSuperAdmin) && (
            <div className="w-full md:w-auto self-start">
              <PurgeStudentsButton schoolSlug={schoolSlug} />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <StatCard title="Total Students" value={totalCount} icon={Users} />
        <StatCard
          title="Active"
          value={activeCount}
          icon={UserCheck}
          iconClassName="text-green-600"
        />
        <StatCard
          title="Graduated"
          value={graduatedCount}
          icon={GraduationCap}
          iconClassName="text-blue-600"
        />
        <StatCard
          title="Withdrawn"
          value={withdrawnCount}
          icon={UserX}
          iconClassName="text-orange-600"
        />
      </div>

      {/* Students Table inside Suspense */}
      <Suspense fallback={<StudentsTableSkeleton />}>
        <StudentsListContent
          schoolId={school.id}
          schoolSlug={schoolSlug}
          classId={effectiveClassId}
          classes={classes}
        />
      </Suspense>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Async Server Component for fetching students
// ----------------------------------------------------------------------------
async function StudentsListContent({
  schoolId,
  schoolSlug,
  classId,
  classes,
}: {
  schoolId: string;
  schoolSlug: string;
  classId: string;
  classes: { id: string; name: string }[];
}) {
  const whereClause: any = { schoolId };
  if (classId !== "all") {
    whereClause.classId = classId;
  }

  const rawStudents = await prisma.student.findMany({
    where: whereClause,
    include: {
      profile: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              image: true,
              banned: true,
              banReason: true,
            },
          },
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
  });

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
    <Card className="backdrop-blur-sm bg-card/50 border-border/50">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="space-y-1.5">
          <CardTitle>
            {classId === "all" ? "All Students" : "Class Students"}
          </CardTitle>
          <CardDescription>
            {classId === "all"
              ? "View and manage all student records"
              : `Viewing students for selected class`}
          </CardDescription>
        </div>
        <div>
          <StudentClassFilter classes={classes} currentClassId={classId} />
        </div>
      </CardHeader>
      <CardContent>
        <StudentsDataTable
          columns={columns}
          data={students}
          schoolSlug={schoolSlug}
        />
      </CardContent>
    </Card>
  );
}

function StudentsTableSkeleton() {
  return (
    <Card className="backdrop-blur-sm bg-card/50 border-border/50">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <Skeleton className="h-11 w-[200px]" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
