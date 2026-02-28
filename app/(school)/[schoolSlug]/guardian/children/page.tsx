// app/(school)/[schoolSlug]/guardian/children/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  Clock,
  ArrowRight,
  GraduationCap,
  Calendar,
  MapPin,
  Phone,
  FileText,
} from "lucide-react";

interface GuardianChildrenPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function GuardianChildrenPage({
  params,
}: GuardianChildrenPageProps) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  const guardian = await prisma.guardian.findFirst({
    where: {
      schoolId: school.id,
      profile: {
        userId: session.user.id,
      },
    },
    include: {
      students: {
        include: {
          student: {
            include: {
              profile: true,
              class: {
                include: {
                  academicYear: true,
                },
              },
              department: true,
              house: true,
              _count: {
                select: {
                  attendances: true,
                  assessmentScores: true,
                  bills: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!guardian) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Children</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your {guardian.students.length}{" "}
          {guardian.students.length === 1 ? "child's" : "children's"}{" "}
          information
        </p>
      </div>

      {/* Children Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {guardian.students.map((gs) => {
          const student = gs.student;
          const initials =
            `${student.profile.firstName.charAt(0)}${student.profile.lastName.charAt(0)}`.toUpperCase();

          return (
            <Card
              key={student.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {student.profile.firstName} {student.profile.lastName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{student.status}</Badge>
                      {gs.isPrimary && (
                        <Badge variant="secondary">Primary Guardian</Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Student ID:</span>
                    <span className="font-mono font-semibold">
                      {student.studentId}
                    </span>
                  </div>
                  {student.admissionNumber && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Admission No:
                      </span>
                      <span className="font-mono font-semibold">
                        {student.admissionNumber}
                      </span>
                    </div>
                  )}
                </div>

                {/* Academic Info */}
                <div className="space-y-2 text-sm">
                  {student.class && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Class:</span>
                      <span className="font-semibold">
                        {student.class.name}
                      </span>
                    </div>
                  )}
                  {student.department && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-semibold">
                        {student.department.name}
                      </span>
                    </div>
                  )}
                  {student.house && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">House:</span>
                      <span className="font-semibold">
                        {student.house.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  {student.profile.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {student.profile.phone}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Born:</span>
                    <span>
                      {new Date(
                        student.profile.dateOfBirth,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {student._count.attendances}
                    </p>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {student._count.assessmentScores}
                    </p>
                    <p className="text-xs text-muted-foreground">Assessments</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{student._count.bills}</p>
                    <p className="text-xs text-muted-foreground">Bills</p>
                  </div>
                </div>

                {/* View Details Button */}
                <Link
                  href={`/${schoolSlug}/guardian/children/${student.id}`}
                  className="block"
                >
                  <Button className="w-full" variant="outline">
                    View Full Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {guardian.students.length === 0 && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No children found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No students are currently linked to your account.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
