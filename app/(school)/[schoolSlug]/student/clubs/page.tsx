import { requireSchoolAccess } from "@/lib/auth/guards";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Users, User, Calendar, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface StudentClubsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function StudentClubsPage({
  params,
}: StudentClubsPageProps) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  // Get current student record with club memberships
  const student = await prisma.student.findFirst({
    where: {
      profile: {
        userId: session.user.id,
      },
    },
    include: {
      clubMembers: {
        include: {
          club: {
            include: {
              teacherInCharge: {
                include: {
                  profile: true,
                },
              },
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!student) return notFound();

  // Also fetch other available clubs for exploration
  const availableClubs = await prisma.club.findMany({
    where: {
      schoolId: school.id,
      isActive: true,
      members: {
        none: {
          studentId: student.id,
        },
      },
    },
    include: {
      teacherInCharge: {
        include: {
          profile: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
    take: 6,
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">
            My Clubs
          </h1>
          <p className="text-muted-foreground/80">
            Manage your extra-curricular activities and societies.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-bold">My Memberships</h2>
        </div>

        {student.clubMembers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {student.clubMembers.map((membership) => {
              const { club } = membership;
              const teacher = club.teacherInCharge;

              return (
                <Card
                  key={membership.id}
                  className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-primary/10"
                >
                  <div className="absolute top-0 right-0 p-2">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary"
                    >
                      {membership.role || "Member"}
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">
                      {club.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {club.description || "No description provided."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{club._count.members} Members</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Joined{" "}
                          {new Date(membership.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t flex items-center gap-3">
                      <Avatar className="h-8 w-8 ring-2 ring-primary/5">
                        <AvatarFallback className="text-xs bg-primary/5 text-primary">
                          {teacher?.profile?.firstName[0]}
                          {teacher?.profile?.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-xs">
                        <p className="font-semibold text-foreground/80">
                          {teacher?.profile?.firstName}{" "}
                          {teacher?.profile?.lastName}
                        </p>
                        <p className="text-muted-foreground/60">
                          Teacher In Charge
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Trophy className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-semibold">No active memberships</h3>
              <p className="text-sm text-muted-foreground/70 max-w-xs mt-1">
                You haven't joined any clubs or societies yet. Explore available
                clubs below!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Discover More Clubs</h2>
        </div>

        {availableClubs.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableClubs.map((club) => (
              <Card
                key={club.id}
                className="hover:border-primary/30 transition-colors"
              >
                <CardHeader>
                  <CardTitle className="text-lg font-bold">
                    {club.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 italic">
                    {club.description ||
                      "Join this club to explore new interests and build community."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{club._count.members} Members</span>
                    </div>
                    {club.teacherInCharge && (
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        <span>
                          Lead: {club.teacherInCharge.profile?.firstName}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Express Interest
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No other clubs available to join at this moment.
          </p>
        )}
      </div>
    </div>
  );
}
