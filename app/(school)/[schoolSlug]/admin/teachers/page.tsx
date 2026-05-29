// app/(school)/[schoolSlug]/admin/teachers/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { Button } from "@/components/ui/button";
import { Plus, Users, GraduationCap, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeachersClient } from "./client";
import { TeacherDialog } from "@/components/school/teachers/teacher-dialog";
import { TeacherPendingInvitationsList } from "@/components/school/teachers/teacher-pending-invitations-list";
import { StatCard } from "@/components/ui/stat-card";

/** Safely convert a Prisma Decimal (or cached plain number/string) to number | null */
const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && typeof (v as { toNumber?: () => number }).toNumber === "function")
    return (v as { toNumber: () => number }).toNumber();
  const n = Number(v);
  return isNaN(n) ? null : n;
};

interface TeachersPageProps {
  params: Promise<{ schoolSlug: string }>;
}

// Cached teacher list — 5 min, tagged
const getTeachers = (schoolId: string) =>
  unstable_cache(
    () =>
      prisma.teacher.findMany({
        where: { schoolId, profileId: { not: null } },
        include: {
          profile: {
            include: {
              user: { select: { id: true, email: true, image: true, banned: true, banReason: true } },
            },
          },
          department: true,
          house: true,
          _count: { select: { subjects: true, classesAsClassTeacher: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    [`admin-teachers-${schoolId}`],
    { revalidate: 300, tags: [`teachers-${schoolId}`] }
  )();

// Cached pending invitations — 5 min
const getPendingInvitations = (schoolId: string) =>
  unstable_cache(
    () =>
      prisma.teacher.findMany({
        where: { schoolId, profileId: null },
        include: { department: true, house: true },
        orderBy: { createdAt: "desc" },
      }),
    [`admin-teachers-pending-${schoolId}`],
    { revalidate: 300, tags: [`teachers-${schoolId}`] }
  )();

// Cached departments + houses — 10 min (rarely change)
const getDepartmentsAndHouses = (schoolId: string) =>
  unstable_cache(
    () =>
      Promise.all([
        prisma.department.findMany({ where: { schoolId, isActive: true }, orderBy: { name: "asc" } }),
        prisma.house.findMany({ where: { schoolId, isActive: true }, orderBy: { name: "asc" } }),
      ]),
    [`admin-dept-houses-${schoolId}`],
    { revalidate: 600, tags: [`departments-${schoolId}`, `houses-${schoolId}`] }
  )();

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

  const school = await prisma.school.findUnique({ where: { subdomain: schoolSlug } });
  if (!school) redirect("/");

  const [allTeachers, pendingTeachers, inviteRecords, [departments, houses]] = await Promise.all([
    getTeachers(school.id),
    getPendingInvitations(school.id),
    prisma.invitation.findMany({
      where: {
        organizationId: school.organizationId,
        status: { in: ["pending", "expired"] },
        role: "teacher",
      },
      orderBy: { createdAt: "desc" },
    }),
    getDepartmentsAndHouses(school.id),
  ]);

  const activeCount = allTeachers.filter((t) => t.isActive).length;
  const totalActive = allTeachers.length;
  const inactiveCount = totalActive - activeCount;

  // Correlate pending teacher records with Better Auth invitation records
  const mappedPending = pendingTeachers.map((t) => {
    const matchingInvite = inviteRecords.find(
      (inv) => inv.email.toLowerCase() === t.invitationEmail?.toLowerCase()
    );
    return {
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      invitationEmail: t.invitationEmail,
      employmentType: t.employmentType,
      createdAt: t.createdAt,
      department: t.department ? { name: t.department.name } : { name: "N/A" },
      invitationId: matchingInvite?.id || "",
      expiresAt: matchingInvite?.expiresAt || new Date(),
      status: matchingInvite?.status || "pending",
    };
  });

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
            promotionPassMark: toNum(d.promotionPassMark),
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
          value={mappedPending.length}
          icon={Clock}
          iconClassName="text-yellow-600"
        />
      </div>

      {/* Teachers client table and pending invitations wrapped in uniform tabs */}
      <TeachersClient
        data={allTeachers
          .filter((t) => t.profile !== null)
          .map((teacher) => ({
            ...teacher,
            profile: teacher.profile!,
            monthlySalary: toNum(teacher.monthlySalary),
            department: {
              ...teacher.department,
              promotionPassMark: toNum(teacher.department?.promotionPassMark),
            },
          }))}
        schoolSlug={schoolSlug}
        departments={departments.map((dept) => ({
          ...dept,
          promotionPassMark: toNum(dept.promotionPassMark),
        }))}
        houses={houses}
        initialInvitations={mappedPending}
      />
    </div>
  );
}
