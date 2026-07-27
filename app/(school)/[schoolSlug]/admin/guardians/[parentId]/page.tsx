import { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { GuardianForm } from "@/components/school/guardians/guardian-form";
import { EditGuardianDialog } from "@/components/school/edit-guardian-dialog";

export const metadata: Metadata = {
  title: "Edit Guardian | Admin Directory",
  description: "View and update parent/guardian information",
};

interface EditGuardianPageProps {
  params: Promise<{
    schoolSlug: string;
    parentId: string;
  }>;
}

export default async function EditGuardianPage({ params }: EditGuardianPageProps) {
  const { schoolSlug, parentId } = await params;
  await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    notFound();
  }

  const guardian = await prisma.guardian.findFirst({
    where: {
      id: parentId,
      schoolId: school.id,
    },
    include: {
      profile: {
        include: {
          user: {
            select: { id: true, banned: true },
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
  });

  if (!guardian) {
    notFound();
  }

  const normalizedGuardian = {
    id: guardian.id,
    guardianId: guardian.guardianId,
    name: `${guardian.firstName} ${guardian.lastName}`,
    email: guardian.email,
    phone: guardian.phone,
    altPhone: guardian.alternatePhone,
    occupation: guardian.occupation,
    isActive: guardian.isActive,
    userId: guardian.profile?.user?.id ?? null,
    isBanned: guardian.profile?.user?.banned ?? false,
    wards: guardian.students.map((gs) => ({
      id: gs.student.id,
      name: `${gs.student.profile.firstName} ${gs.student.profile.lastName}`,
      studentId: gs.student.studentId,
      class: gs.student.class?.name || "Unassigned",
      relationship: guardian.relationshipType.replace("_", " "),
    })),
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title={`Guardian: ${normalizedGuardian.name}`}
        description={`Manage details for guardian ID: ${guardian.guardianId}`}
      />
      <div className="max-w-2xl bg-card border rounded-xl p-6 shadow-sm">
        <EditGuardianDialog
          schoolSlug={schoolSlug}
          guardian={normalizedGuardian}
        />
      </div>
    </div>
  );
}
