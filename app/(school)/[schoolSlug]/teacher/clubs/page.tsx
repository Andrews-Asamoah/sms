import { Suspense } from "react";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, LayoutDashboard, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { headers } from "next/headers";

export default async function TeacherClubsPage({
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

  // Fetch the teacher profile
  const teacher = await prisma.teacher.findFirst({
    where: {
      profile: {
        user: {
          email: session.user.email,
        },
      },
      schoolId: school.id,
    },
    include: {
      clubs: {
        include: {
          _count: {
            select: { members: true },
          },
        },
      },
    },
  });

  if (!teacher) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Clubs</h1>
        <p className="text-muted-foreground">
          Clubs and societies you are currently coordinating.
        </p>
      </div>

      {teacher.clubs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="font-medium text-lg">No clubs assigned</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              You are not currently assigned as a coordinator for any school
              clubs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teacher.clubs.map((club) => (
            <Card key={club.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={club.isActive ? "secondary" : "outline"}>
                    {club.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {club._count.members} Members
                  </div>
                </div>
                <CardTitle>{club.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {club.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/${schoolSlug}/teacher/clubs/${club.id}`}>
                  <Button variant="outline" className="w-full group">
                    Manage Members
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
