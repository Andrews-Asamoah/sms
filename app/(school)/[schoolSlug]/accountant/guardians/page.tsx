import { Metadata } from "next";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { ParentsTable } from "@/components/school/parents-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Parents & Guardians Directory",
  description: "View all registered parents and their wards",
};

interface ParentsPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

// Cached per school for 5 minutes, tagged for on-demand revalidation
const getGuardians = (schoolId: string) =>
  unstable_cache(
    () =>
      prisma.guardian.findMany({
        where: { schoolId },
        include: {
          profile: {
            include: {
              user: { select: { id: true, banned: true, banReason: true } },
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
      }),
    [`accountant-guardians-${schoolId}`],
    { revalidate: 300, tags: [`guardians-${schoolId}`] }
  )();

export default function AccountantParentsPage({ params }: ParentsPageProps) {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Parents & Guardians"
        description="A complete directory of all parents, showing their contact information and linked students."
      />
      <Suspense fallback={<GuardiansDashboardSkeleton />}>
        <GuardiansContent params={params} />
      </Suspense>
    </div>
  );
}

async function GuardiansContent({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) return null;

  const guardians = await getGuardians(school.id);

  // Normalize data for the UI
  const normalizedGuardians = guardians.map((g) => {
    const wards = g.students.map((gs) => ({
      id: gs.student.id,
      name: `${gs.student.profile.firstName} ${gs.student.profile.lastName}`,
      studentId: gs.student.studentId,
      class: gs.student.class?.name || "Unassigned",
      relationship: g.relationshipType.replace("_", " "),
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
    <ParentsTable
      initialData={normalizedGuardians}
      schoolSlug={schoolSlug}
    />
  );
}

function GuardiansDashboardSkeleton() {
  return (
    <Card className="bg-card/50 backdrop-blur-md border-border/50 mt-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-[300px]" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-[100px]" />
              <Skeleton className="h-10 w-[100px]" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
