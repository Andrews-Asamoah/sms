// app/(school)/[schoolSlug]/admin/houses/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus, Users, Trophy, Home, UserX } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HousesDataTable } from "@/components/school/houses/houses-table";
import { HouseDialog } from "@/components/school/houses/house-dialog";
import { HouseAssignmentPanel } from "@/components/school/houses/house-assignment-panel";

interface HousesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

interface SchoolSettings {
  currentAcademicYearId?: string | null;
  [key: string]: unknown;
}

export default async function HousesPage({ params }: HousesPageProps) {
  const { schoolSlug } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  // Check authorization
  if (
    role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher" &&
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

  const { currentAcademicYearId } =
    (school.settings as unknown as SchoolSettings) ?? {};

  // Fetch houses, stats, teachers, unassigned count, and classes in parallel
  const [houses, activeCount, assignedStudents, unassignedCount, rawTeachers, classes] =
    await Promise.all([
      prisma.house.findMany({
        where: { schoolId: school.id },
        include: {
          houseTeacher: {
            include: {
              profile: true,
            },
          },
          _count: {
            select: {
              students: true,
              teachersInHouse: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.house.count({
        where: { schoolId: school.id, isActive: true },
      }),
      prisma.student.count({
        where: {
          schoolId: school.id,
          houseId: { not: null },
          status: "ACTIVE",
        },
      }),
      // Count students without a house but with a class (eligible for auto-assign)
      prisma.student.count({
        where: {
          schoolId: school.id,
          houseId: null,
          classId: { not: null },
          status: "ACTIVE",
        },
      }),
      prisma.teacher.findMany({
        where: {
          schoolId: school.id,
          isActive: true,
          profileId: { not: null },
        },
        include: {
          profile: true,
        },
        orderBy: {
          profile: {
            firstName: "asc",
          },
        },
      }),
      // Classes for the manual assign dialog (current academic year only)
      prisma.class.findMany({
        where: {
          schoolId: school.id,
          isActive: true,
          ...(currentAcademicYearId ? { academicYearId: currentAcademicYearId } : {}),
        },
        include: { academicYear: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const teachers = rawTeachers.map((t) => ({
    id: t.id,
    profile: t.profile!,
  }));

  // Serialise houses for the assignment panel (strip Prisma Decimal etc.)
  const houseOptions = houses
    .filter((h) => h.isActive)
    .map((h) => ({
      id: h.id,
      name: h.name,
      code: h.code,
      color: h.color,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Houses Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage school houses, house teachers, and student allocations
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Assignment panel — auto-assign + manual assign */}
          <HouseAssignmentPanel
            schoolSlug={schoolSlug}
            schoolId={school.id}
            unassignedCount={unassignedCount}
            houses={houseOptions}
            classes={classes}
          />
          <HouseDialog
            schoolId={school.id}
            schoolSlug={schoolSlug}
            teachers={teachers}
          >
            <Button size="lg">
              <Plus className="mr-2 h-5 w-5" />
              New House
            </Button>
          </HouseDialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Houses</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{houses.length}</div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Houses</CardTitle>
            <Trophy className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Students Assigned
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedStudents}</div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unassigned Students
            </CardTitle>
            <UserX className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unassignedCount}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unassignedCount === 0
                ? "All students assigned"
                : "Eligible for auto-assign"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Houses Table */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>All Houses</CardTitle>
          <CardDescription>
            View and manage all school houses and their assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HousesDataTable
            data={
              houses.map((h) => ({
                ...h,
                houseTeacher:
                  h.houseTeacher && h.houseTeacher.profile
                    ? {
                        id: h.houseTeacher.id,
                        profile: h.houseTeacher.profile,
                      }
                    : null,
              })) as any
            }
            schoolSlug={schoolSlug}
            schoolId={school.id}
            teachers={teachers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
