import { Metadata } from "next";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { ParentsClient } from "./parents-client";
import { Loader2 } from "lucide-react";

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
      profile: true,
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
      wards,
    };
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Parents & Guardians"
        description="A complete directory of all parents, showing their contact information and linked students."
      />
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <ParentsClient
          initialData={normalizedGuardians}
          schoolSlug={schoolSlug}
        />
      </Suspense>
    </div>
  );
}
