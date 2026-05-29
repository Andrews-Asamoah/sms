import { Metadata } from "next";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { StaffClient } from "./staff-client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Staff Directory",
  description: "Manage teaching and non-teaching staff members",
};

interface StaffPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

// Cached per school for 5 minutes, tagged for on-demand revalidation
const getNonTeachingStaff = (schoolId: string) =>
  unstable_cache(
    () =>
      prisma.staff.findMany({
        where: { schoolId },
        include: {
          profile: {
            include: { user: { select: { id: true, banned: true, email: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    [`admin-staff-${schoolId}`],
    { revalidate: 300, tags: [`staff-${schoolId}`] }
  )();

export default async function AdminStaffPage({ params }: StaffPageProps) {
  const { schoolSlug } = await params;
  await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, organizationId: true },
  });

  if (!school) return null;

  const [nonTeachingStaff, pendingInvitations] = await Promise.all([
    getNonTeachingStaff(school.id),
    prisma.invitation.findMany({
      where: {
        organizationId: school.organizationId,
        status: { in: ["pending", "expired"] },
        role: { in: ["admin", "headteacher", "accountant", "staff"] },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Normalize data for StaffClient - Only non-teaching staff
  const staffList = nonTeachingStaff
    .map((s) => ({
      id: s.id,
      profileId: s.profileId,
      schoolId: s.schoolId,
      userId: s.profile?.user?.id,
      isBanned: s.profile?.user?.banned ?? false,
      employeeId: s.staffNumber || s.staffId,
      firstName: s.profile?.firstName,
      lastName: s.profile?.lastName,
      email: s.profile?.user?.email || null,
      phone: s.profile?.phone || null,
      type: s.staffType.replace("_", " "),
      category: "NON_TEACHING" as const,
      isActive: s.isActive,
      hireDate: s.hireDate,
      gender: s.profile?.gender,
    }))
    .sort((a, b) => {
      // Sort by name alphabetically
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Staff Directory"
        description="Manage and view all non-teaching staff members."
      >
        <Link href={`/${schoolSlug}/admin/staff/new`}>
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Staff
          </Button>
        </Link>
      </DashboardPageHeader>
      <StaffClient
        initialData={staffList}
        schoolSlug={schoolSlug}
        initialInvitations={pendingInvitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role || "staff",
          status: inv.status,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
        }))}
      />
    </div>
  );
}
