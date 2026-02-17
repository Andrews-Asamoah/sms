// app/(school)/[schoolSlug]/admin/houses/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus, Users, Trophy, Home } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HousesDataTable } from "@/components/school/houses/houses-table";
import { HouseDialog } from "@/components/school/houses/house-dialog";

interface HousesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function HousesPage({ params }: HousesPageProps) {
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

  // Fetch houses with related data
  const [houses, activeCount, totalStudents] = await Promise.all([
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
      },
    }),
  ]);

  // Fetch available teachers for house teacher assignment
  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId: school.id,
      isActive: true,
    },
    include: {
      profile: true,
    },
    orderBy: {
      profile: {
        firstName: "asc",
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Houses Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage school houses, house teachers, and student allocations
          </p>
        </div>
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <div className="text-2xl font-bold">{totalStudents}</div>
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
            data={houses}
            schoolSlug={schoolSlug}
            schoolId={school.id}
            teachers={teachers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
