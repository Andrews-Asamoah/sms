import { Suspense } from "react";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { ClubDetailsClient } from "./club-details-client";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";

interface ClubDetailsPageProps {
  params: Promise<{
    schoolSlug: string;
    clubId: string;
  }>;
}

export default async function ClubDetailsPage({
  params,
}: ClubDetailsPageProps) {
  const { schoolSlug, clubId } = await params;

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    notFound();
  }

  await requireSchoolAccess(schoolSlug);

  const club = await prisma.club.findUnique({
    where: { id: clubId, schoolId: school.id },
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
      members: {
        include: {
          student: {
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
        },
      },
    },
  });

  if (!club) {
    notFound();
  }

  // Fetch all students in the school for membership management
  const allStudents = await prisma.student.findMany({
    where: { schoolId: school.id, status: "ACTIVE" },
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

  // Fetch teachers for the settings tab
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
        title={club.name}
        description={club.description || "Manage club membership and settings."}
      />

      <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
        <ClubDetailsClient
          club={club}
          allStudents={allStudents}
          teachers={teachers}
          schoolSlug={schoolSlug}
        />
      </Suspense>
    </div>
  );
}
