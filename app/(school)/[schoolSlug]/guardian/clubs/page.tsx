import { Suspense } from "react";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { auth } from "@/lib/auth";
import { DashboardPageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, User, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { headers } from "next/headers";

export default async function GuardianClubsPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
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

  // Fetch the guardian and their wards' clubs
  const guardian = await prisma.guardian.findFirst({
    where: {
      email: session.user.email,
      schoolId: school.id,
    },
    include: {
      students: {
        include: {
          student: {
            include: {
              profile: true,
              clubMembers: {
                include: {
                  club: {
                    include: {
                      teacherInCharge: {
                        include: { profile: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!guardian) {
    notFound();
  }

  const allWardsClubs = guardian.students.flatMap((ward) =>
    ward.student.clubMembers.map((cm) => ({
      ...cm.club,
      ward: ward.student,
      role: cm.role,
    })),
  );

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Wards' Clubs & Societies"
        description="View the extra-curricular activities and societies your children are involved in."
      />

      {allWardsClubs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="font-medium text-lg">No club memberships found</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your wards haven't been enrolled in any school clubs or societies
              yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allWardsClubs.map((club) => (
            <Card
              key={`${club.id}-${club.ward.id}`}
              className="overflow-hidden"
            >
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="font-normal">
                    {club.role || "Member"}
                  </Badge>
                  {club.isActive ? (
                    <Badge
                      variant="outline"
                      className="text-green-600 bg-green-50 border-green-200"
                    >
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{club.name}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[40px]">
                  {club.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Ward
                    </p>
                    <p className="text-sm font-medium">
                      {club.ward.profile?.firstName || ""} {club.ward.profile?.lastName || ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      In Charge
                    </p>
                    <p className="text-sm font-medium">
                      {club.teacherInCharge?.profile?.firstName || ""}{" "}
                      {club.teacherInCharge?.profile?.lastName || "None"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
