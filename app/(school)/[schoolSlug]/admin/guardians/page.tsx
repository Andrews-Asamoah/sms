import { Metadata } from "next";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { ParentsTable } from "@/components/school/parents-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Parents & Guardians Directory",
  description: "View and manage all registered parents and their wards",
};

interface ParentsPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function AdminParentsPage({ params }: ParentsPageProps) {
  const { schoolSlug } = await params;
  await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    return null;
  }

  // Fetch Guardians heavily loaded with nested students
  const guardians = await prisma.guardian.findMany({
    where: { schoolId: school.id },
    include: {
      profile: {
        include: {
          user: {
            select: {
              id: true,
              banned: true,
              banReason: true,
            },
          },
        },
      },
      students: {
        include: {
          student: {
            include: {
              profile: true,
              class: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Normalize data for the UI
  const normalizedGuardians = guardians.map((g) => {
    const wards = g.students.map((gs) => ({
      id: gs.student.id,
      name: `${gs.student.profile.firstName} ${gs.student.profile.lastName}`,
      studentId: gs.student.studentId,
      class: gs.student.class?.name || "Unassigned",
      relationship: g.relationshipType.replace("_", " "), // from Guardian model
      isPrimary: gs.isPrimary,
    }));

    return {
      id: g.id,
      guardianId: g.guardianId,
      name: `${g.firstName} ${g.lastName}`,
      email: g.email,
      phone: g.phone,
      altPhone: g.alternatePhone,
      occupation: g.occupation,
      isActive: g.isActive,
      userId: g.profile?.user?.id ?? null,
      isBanned: g.profile?.user?.banned ?? false,
      wards,
    };
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Parents & Guardians"
        description="A complete directory of all parents, showing their contact information and linked students."
      >
        <Link href={`/${schoolSlug}/admin/guardians/new`}>
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Parent
          </Button>
        </Link>
      </DashboardPageHeader>
      <ParentsTable initialData={normalizedGuardians} schoolSlug={schoolSlug} />
    </div>
  );
}
