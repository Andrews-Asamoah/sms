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
import { Home, Trophy, User, Phone, Shield, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StudentHousePageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function StudentHousePage({
  params,
}: StudentHousePageProps) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  // Get current student record with house info
  const student = await prisma.student.findFirst({
    where: {
      profile: {
        userId: session.user.id,
      },
    },
    include: {
      house: {
        include: {
          houseTeacher: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });

  if (!student || !student.houseId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Home className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
        <h2 className="text-2xl font-bold">House Information</h2>
        <p className="text-muted-foreground mt-2">
          You are not currently assigned to any house.
        </p>
      </div>
    );
  }

  const house = student.house!;
  const houseTeacher = house.houseTeacher;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My House</h1>
          <p className="text-muted-foreground">
            Information about your school house and leadership.
          </p>
        </div>
        <Badge
          className="px-4 py-1 text-lg font-bold"
          style={{
            backgroundColor: house.color || "#3b82f6",
            color: "#fff",
          }}
        >
          {house.name}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-card to-card/50">
          <div
            className="h-2 w-full"
            style={{ backgroundColor: house.color || "#3b82f6" }}
          />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{house.name} House</CardTitle>
                <CardDescription className="text-base">
                  {house.code}
                </CardDescription>
              </div>
              <Home className="h-8 w-8 opacity-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {house.motto && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 italic text-center">
                &quot;{house.motto}&quot;
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                About Our House
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {house.description ||
                  "Welcome to your house! This is where you belong and compete for school glory."}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                House Master / Mistress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {houseTeacher ? (
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                      {houseTeacher.profile?.firstName[0]}
                      {houseTeacher.profile?.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg">
                      {houseTeacher.profile?.firstName}{" "}
                      {houseTeacher.profile?.lastName}
                    </h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      Senior Member
                    </p>
                    {houseTeacher.profile?.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {houseTeacher.profile.phone}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No house teacher assigned yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-yellow-500/5 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                House Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic">
                Coming soon: Track house points and inter-house competition
                records here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
