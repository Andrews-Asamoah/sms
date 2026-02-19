// app/(system)/schools/[schoolId]/overview/page.tsx

import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { SchoolOverview } from "@/components/System/Schools/school-overview";
import { SchoolInvitationsList } from "@/components/System/Schools/school-invitations-list";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { InviteAdminButton } from "@/components/System/Schools/invite-admin-button";

interface SchoolOverviewPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function SchoolOverviewPage({
  params,
}: SchoolOverviewPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const { schoolSlug } = await params;

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      subscription: true,
      _count: {
        select: {
          students: true,
          teachers: true,
          classes: true,
          departments: true,
        },
      },
      academicYears: {
        where: { isCurrent: true },
        include: {
          terms: {
            where: { isCurrent: true },
          },
        },
        take: 1,
      },
      organization: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          invitations: {
            where: {
              status: "pending",
            },
            include: {
              inviter: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  if (!school) {
    notFound();
  }

  // Lazy expiration check
  const now = new Date();
  const expiredInvitations = school.organization.invitations.filter(
    (invitation) =>
      invitation.status === "pending" && new Date(invitation.expiresAt) < now,
  );

  if (expiredInvitations.length > 0) {
    // Update expired invitations (fire and forget or await)
    await prisma.invitation.updateMany({
      where: {
        id: { in: expiredInvitations.map((i) => i.id) },
      },
      data: {
        status: "EXPIRED",
      },
    });

    // Remove expired from the list to be displayed locally
    school.organization.invitations = school.organization.invitations.filter(
      (invitation) => !expiredInvitations.includes(invitation),
    );
  }

  // Check permissions
  const isSuperAdmin = session.isSuperAdmin;
  const isMember = school.organization.members.some(
    (m) => m.userId === session.user.id,
  );

  if (!isSuperAdmin && !isMember) {
    redirect("/schools");
  }

  // Check if school needs administrators
  const nonSuperAdminMembers = school.organization.members.filter(
    (m) => m.user.role !== "superAdmin",
  );
  const hasNoAdmins = nonSuperAdminMembers.length === 0;
  const hasPendingInvitations = school.organization.invitations.length > 0;

  // Serialize the school data to fix Decimal/Date issues
  const serializedSchool = JSON.parse(
    JSON.stringify(school, (key, value) => {
      // Convert Decimal to number
      if (
        value !== null &&
        typeof value === "object" &&
        value.constructor?.name === "Decimal"
      ) {
        return parseFloat(value.toString());
      }
      // Convert Date to ISO string
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }),
  );

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Header with Invite Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">School Overview</h1>
          <p className="text-muted-foreground mt-2">
            View key information and statistics for {school.name}
          </p>
        </div>
        {isSuperAdmin && (
          <InviteAdminButton
            schoolSlug={school.subdomain}
            schoolName={school.name}
          />
        )}
      </div>

      {/* Alert if no school administrators */}
      {isSuperAdmin && hasNoAdmins && !hasPendingInvitations && (
        <Card className="backdrop-blur-xl bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-yellow-500/20 p-2">
                <Shield className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  No School Administrators
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  This school doesn&apos;t have any administrators yet. Invite a
                  school admin to manage day-to-day operations. You&apos;ll
                  remain the owner with full access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {school.organization.invitations.length > 0 && (
        <SchoolInvitationsList
          invitations={school.organization.invitations}
          schoolId={school.id}
          schoolSlug={school.subdomain} // ✅ Add subdomain if component needs it
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* Main School Overview */}
      <SchoolOverview
        school={serializedSchool}
        currentUserId={session.user.id}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
