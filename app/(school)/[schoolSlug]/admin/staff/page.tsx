import { Metadata } from "next";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { StaffClient } from "./staff-client";
import { Loader2, Plus } from "lucide-react";
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

export default async function AdminStaffPage({ params }: StaffPageProps) {
  const { schoolSlug } = await params;
  await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    return null;
  }

  // Fetch Non-Teaching Staff
  const nonTeachingStaff = await prisma.staff.findMany({
    where: { schoolId: school.id },
    include: {
      profile: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch Teachers
  const teachers = await prisma.teacher.findMany({
    where: { schoolId: school.id },
    include: {
      profile: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Normalize data into a unified array
  const unifiedStaff = [
    ...nonTeachingStaff.map((s) => ({
      id: s.id,
      profileId: s.profileId,
      schoolId: s.schoolId,
      employeeId: s.staffNumber || s.staffId,
      firstName: s.profile?.firstName,
      lastName: s.profile?.lastName,
      email: null, // UserProfile has no email field
      phone: s.profile?.phone,
      type: s.staffType.replace("_", " "),
      category: "NON_TEACHING" as const,
      isActive: s.isActive,
      hireDate: s.hireDate,
      gender: s.profile?.gender,
    })),
    ...teachers.map((t) => ({
      id: t.id,
      profileId: t.profileId,
      schoolId: t.schoolId,
      employeeId: t.teacherId, // using internal teacher ID
      firstName: t.profile?.firstName,
      lastName: t.profile?.lastName,
      email: null, // UserProfile has no email field
      phone: t.profile?.phone,
      type: "TEACHER",
      category: "TEACHING" as const,
      isActive: t.isActive,
      hireDate: t.createdAt, // Teacher model lacks hireDate, using createdAt
      gender: t.profile?.gender,
    })),
  ].sort((a, b) => {
    // Sort by name alphabetically
    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Staff Directory"
        description="A unified directory of all teaching and non-teaching employees."
      >
        <Link href={`/${schoolSlug}/admin/staff/new`}>
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Staff
          </Button>
        </Link>
      </DashboardPageHeader>
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <StaffClient initialData={unifiedStaff} schoolSlug={schoolSlug} />
      </Suspense>
    </div>
  );
}
