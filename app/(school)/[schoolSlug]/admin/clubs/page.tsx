import { Suspense } from "react";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { ClubsClient } from "./clubs-client";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";

interface ClubsPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function ClubsPage({ params }: ClubsPageProps) {
  const { schoolSlug } = await params;
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    notFound();
  }

  await requireSchoolAccess(schoolSlug);

  // Fetch clubs
  const clubs = await prisma.club.findMany({
    where: { schoolId: school.id },
    include: {
      teacherInCharge: {
        include: {
          profile: {
            include: {
              user: {
                select: { image: true },
              },
            },
          },
        },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Fetch teachers for the creation dialog
  const teachers = await prisma.teacher.findMany({
    where: { schoolId: school.id },
    include: {
      profile: {
        include: {
          user: {
            select: { image: true },
          },
        },
      },
    },
    orderBy: { profile: { firstName: "asc" } },
  });

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Clubs & Societies"
        description="Manage school clubs, societies and their teacher coordinators."
      />

      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <ClubsClient
          clubs={clubs}
          teachers={teachers}
          schoolId={school.id}
          schoolSlug={schoolSlug}
        />
      </Suspense>
    </div>
  );
}
