import { requireSchoolAccess } from "@/lib/auth/guards";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, GraduationCap, MapPin } from "lucide-react";

interface ClassmatesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function ClassmatesPage({ params }: ClassmatesPageProps) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  // Get current student record
  const student = await prisma.student.findFirst({
    where: {
      profile: {
        userId: session.user.id,
      },
    },
    select: {
      id: true,
      classId: true,
    },
  });

  if (!student || !student.classId) {
    return notFound();
  }

  // Fetch classmates (same class)
  const classmates = await prisma.student.findMany({
    where: {
      classId: student.classId,
      status: "ACTIVE",
    },
    include: {
      profile: true,
      class: true,
    },
    orderBy: {
      profile: {
        firstName: "asc",
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Classmates</h1>
          <p className="text-muted-foreground">
            Students in {classmates[0]?.class?.name || "your class"}
          </p>
        </div>
        <Badge variant="secondary" className="px-4 py-1">
          {classmates.length} Students Total
        </Badge>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {classmates.map((mate) => {
          const isMe = mate.id === student.id;
          const mateInitials =
            `${mate.profile.firstName[0]}${mate.profile.lastName[0]}`.toUpperCase();

          return (
            <Card
              key={mate.id}
              className={`overflow-hidden transition-all hover:shadow-md ${isMe ? "ring-2 ring-primary" : ""}`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="h-20 w-20 border-2 border-muted">
                    <AvatarFallback
                      className={`text-xl ${isMe ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      {mateInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg leading-tight">
                      {mate.profile.firstName} {mate.profile.lastName}
                      {isMe && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (You)
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <GraduationCap className="h-3 w-3" />
                      <span>{mate.class?.name}</span>
                    </div>
                  </div>

                  <div className="pt-2 w-full grid grid-cols-1 gap-2 border-t text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Student</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
