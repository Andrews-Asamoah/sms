// app/(school)/[schoolSlug]/admin/teachers/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus, Users, GraduationCap, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeachersClient } from "./client";
import { TeacherDialog } from "@/components/school/teachers/teacher-dialog";
import { TeacherPendingInvitationsList } from "@/components/school/teachers/teacher-pending-invitations-list";
import { StatCard } from "@/components/ui/stat-card";

interface TeachersPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function TeachersPage({ params }: TeachersPageProps) {
  const { schoolSlug } = await params;

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
  });

  if (!school) {
    redirect("/");
  }

  const [allTeachers, activeCount, pendingInvitations, departments, houses] =
    await Promise.all([
      // Active (linked) teachers only
      prisma.teacher.findMany({
        where: { schoolId: school.id, profileId: { not: null } },
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
        where: {
          schoolId: school.id,
          isActive: true,
          profileId: { not: null },
        },
      }),
      // Pending invitations (no profile yet)
      prisma.teacher.findMany({
        where: { schoolId: school.id, profileId: null },
        include: {
          department: true,
          house: true,
        },
        orderBy: { createdAt: "desc" },
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

  const totalActive = allTeachers.length;
  const inactiveCount = totalActive - activeCount;

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
          departments={departments.map((d) => ({
            ...d,
            promotionPassMark: d.promotionPassMark
              ? d.promotionPassMark.toNumber()
              : null,
          }))}
          houses={houses}
        >
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Invite Teacher
          </Button>
        </TeacherDialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <StatCard
          title="Total Teachers"
          value={totalActive}
          icon={GraduationCap}
        />
        <StatCard
          title="Active Teachers"
          value={activeCount}
          icon={Users}
          iconClassName="text-green-600"
        />
        <StatCard
          title="Inactive Teachers"
          value={inactiveCount}
          icon={Users}
          iconClassName="text-orange-600"
        />
        <StatCard
          title="Pending Invitations"
          value={pendingInvitations.length}
          icon={Clock}
          iconClassName="text-yellow-600"
        />
      </div>

      {/* Pending Invitations */}
      <TeacherPendingInvitationsList
        pendingInvitations={pendingInvitations}
        schoolSlug={schoolSlug}
      />

      {/* Teachers Table */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <CardDescription>
            View and manage all teaching staff and their assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeachersClient
            data={allTeachers
              .filter((t) => t.profile !== null)
              .map((teacher) => ({
                ...teacher,
                profile: teacher.profile!,
                monthlySalary: teacher.monthlySalary
                  ? teacher.monthlySalary.toNumber()
                  : null,
                department: {
                  ...teacher.department,
                  promotionPassMark: teacher.department.promotionPassMark
                    ? teacher.department.promotionPassMark.toNumber()
                    : null,
                },
              }))}
            schoolSlug={schoolSlug}
            departments={departments.map((dept) => ({
              ...dept,
              promotionPassMark: dept.promotionPassMark
                ? dept.promotionPassMark.toNumber()
                : null,
            }))}
            houses={houses}
          />
        </CardContent>
      </Card>
    </div>
  );
}
