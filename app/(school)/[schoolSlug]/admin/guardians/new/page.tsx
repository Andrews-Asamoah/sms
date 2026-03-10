import { requireSchoolAccess } from "@/lib/auth/guards";
import prisma from "@/lib/prisma";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { GuardianForm } from "@/components/school/guardians/guardian-form";
import { notFound } from "next/navigation";

interface NewGuardianPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function NewGuardianPage({
  params,
}: NewGuardianPageProps) {
  const { schoolSlug } = await params;
  await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    notFound();
  }

  // Fetch all students to allow linking as wards
  const students = await prisma.student.findMany({
    where: { schoolId: school.id },
    include: {
      profile: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      class: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { profile: { firstName: "asc" } },
      { profile: { lastName: "asc" } },
    ],
  });

  const normalizedStudents = students.map((s) => ({
    id: s.id,
    name: `${s.profile.firstName} ${s.profile.lastName}`,
    studentId: s.studentId,
    class: s.class?.name || "Unassigned",
  }));

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Add New Guardian"
        description="Register a new parent or guardian and link them to their wards."
      />
      <div className="max-w-4xl">
        <GuardianForm
          schoolId={school.id}
          schoolSlug={schoolSlug}
          students={normalizedStudents}
        />
      </div>
    </div>
  );
}
