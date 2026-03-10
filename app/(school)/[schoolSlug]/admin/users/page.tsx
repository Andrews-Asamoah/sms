import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { UsersClient } from "@/components/school/users/users-client";
import { Loader2 } from "lucide-react";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);
  const schoolRole = getSchoolRole(session, schoolSlug);

  // Fetch school details
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, organizationId: true, name: true },
  });

  if (!school) {
    return <div>School not found</div>;
  }

  // Fetch all members of the organization
  const members = await prisma.member.findMany({
    where: {
      organizationId: school.organizationId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          userProfile: {
            include: {
              teacher: {
                where: { schoolId: school.id },
                select: { id: true },
              },
              student: {
                where: { schoolId: school.id },
                select: { id: true },
              },
              guardian: {
                where: { schoolId: school.id },
                select: { id: true },
              },
              staff: {
                where: { schoolId: school.id },
                select: { id: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">System Users</h2>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <UsersClient
          members={members}
          schoolSlug={schoolSlug}
          currentUserId={session.user.id}
          userRole={schoolRole?.effectiveRole || "member"}
        />
      </Suspense>
    </div>
  );
}
