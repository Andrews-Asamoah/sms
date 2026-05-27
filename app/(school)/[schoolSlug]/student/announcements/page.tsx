import { Suspense } from "react";
import { AnnouncementsPageContent } from "@/components/school/announcements-page";
import { getSession } from "@/lib/auth/session";
import { getActiveSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Announcements",
  description: "View school announcements and messages.",
};

export default async function PortalAnnouncementsPage({
  params,
}: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  return (
    <Suspense fallback={<AnnouncementsSkeleton />}>
      <AnnouncementsContent schoolSlug={schoolSlug} />
    </Suspense>
  );
}

async function AnnouncementsContent({ schoolSlug }: { schoolSlug: string }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = await getActiveSchoolRole(session, schoolSlug);
  if (!role) redirect("/login");

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) redirect("/login");

  const userId = session.user.id;
  const effectiveRole = role.effectiveRole;

  const getCachedAnnouncements = unstable_cache(
    async (sId: string, uId: string, eRole: string) => {
      const userClassIds = new Set<string>();
      const userClubIds = new Set<string>();

      const [enrollment, clubMemberships, guardianAdmissions] = await Promise.all([
        prisma.enrollment.findFirst({
          where: { student: { profile: { userId: uId } }, status: "ACTIVE" },
          select: { classId: true },
        }),
        prisma.clubMember.findMany({
          where: { student: { profile: { userId: uId } } },
          select: { clubId: true },
        }),
        eRole === "guardian"
          ? prisma.guardianStudent.findMany({
              where: { guardian: { profile: { userId: uId } } },
              select: {
                student: {
                  select: {
                    enrollments: { where: { status: "ACTIVE" }, select: { classId: true } },
                    clubMembers: { select: { clubId: true } },
                  },
                },
              },
            })
          : Promise.resolve([]),
      ]);

      if (enrollment) userClassIds.add(enrollment.classId);
      clubMemberships.forEach((m) => userClubIds.add(m.clubId));
      guardianAdmissions.forEach((ga) => {
        ga.student.enrollments.forEach((e) => userClassIds.add(e.classId));
        ga.student.clubMembers.forEach((cm) => userClubIds.add(cm.clubId));
      });

      const announcements = await prisma.announcement.findMany({
        where: {
          schoolId: sId,
          OR: [
            { target: "ALL" },
            { target: eRole.toUpperCase() },
            { authorId: uId },
            ...Array.from(userClassIds).map((id) => ({ target: `CLASS:${id}` })),
            ...Array.from(userClubIds).map((id) => ({ target: `CLUB:${id}` })),
          ],
        },
        include: {
          author: { select: { name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const labelMap: Record<string, string> = {
        ALL: "Everyone",
        TEACHER: "Teachers",
        STUDENT: "Students & Parents",
        STAFF: "Staff",
        GUARDIAN: "Guardians",
        ACCOUNTANT: "Accountants",
      };

      return announcements.map((a) => ({
        ...a,
        targetName: labelMap[a.target] || a.target,
      }));
    },
    [`announcements-${school.id}-${userId}`],
    {
      revalidate: 300,
      tags: [`announcements-${school.id}`],
    }
  );

  const announcements = await getCachedAnnouncements(school.id, userId, effectiveRole);
  const serializedAnnouncements = JSON.parse(JSON.stringify(announcements));
  const canManage = effectiveRole === "teacher"; // Teachers can manage their own class announcements

  return (
    <AnnouncementsPageContent
      canManage={canManage}
      canSendExternal={false}
      showFinancialMessage={false}
      initialAnnouncements={serializedAnnouncements}
    />
  );
}

function AnnouncementsSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
