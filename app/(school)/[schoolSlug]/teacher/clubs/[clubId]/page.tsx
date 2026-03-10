import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { auth } from "@/lib/auth";
import { ClubDetailsClient } from "../../../admin/clubs/[clubId]/club-details-client";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { headers } from "next/headers";

interface TeacherClubDetailsPageProps {
  params: Promise<{
    schoolSlug: string;
    clubId: string;
  }>;
}

export default async function TeacherClubDetailsPage({
  params,
}: TeacherClubDetailsPageProps) {
  const { schoolSlug, clubId } = await params;

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    notFound();
  }

  await requireSchoolAccess(schoolSlug);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    notFound();
  }

  const [club, allStudents, teachers] = await Promise.all([
    prisma.club.findUnique({
      where: { id: clubId, schoolId: school.id },
      include: {
        teacherInCharge: {
          include: { 
            profile: {
              include: { user: true }
            }
          },
        },
        members: {
          include: {
            student: {
              include: { 
                profile: {
                  include: { user: true }
                }
              },
            },
          },
        },
      },
    }),
    prisma.student.findMany({
      where: { schoolId: school.id, status: "ACTIVE" },
      include: { 
        profile: {
          include: { user: true }
        }
      },
      orderBy: { profile: { firstName: "asc" } },
    }),
    prisma.teacher.findMany({
      where: { schoolId: school.id, isActive: true },
      include: { 
        profile: {
          include: { user: true }
        }
      },
      orderBy: { profile: { firstName: "asc" } },
    })
  ]);

  if (!club) {
    notFound();
  }

  // Security: Check if this teacher is the one in charge
  const currentUserEmail = session.user.email;
  const teacherInChargeEmail = club.teacherInCharge?.profile?.user?.email;

  if (teacherInChargeEmail !== currentUserEmail) {
    // Alternatively, fetch teacher and check ID
    const teacher = await prisma.teacher.findFirst({
      where: { 
        schoolId: school.id,
        profile: {
          user: {
            email: currentUserEmail
          }
        }
      },
    });
    if (!teacher || club.teacherInChargeId !== teacher.id) {
      redirect(`/${schoolSlug}/teacher/clubs`);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={club.name}
        description={club.description || "Manage your club membership."}
      />

      <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
        <ClubDetailsClient
          club={club as any}
          allStudents={allStudents as any}
          teachers={teachers as any}
          schoolSlug={schoolSlug}
        />
      </Suspense>
    </div>
  );
}
