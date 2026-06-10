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
              profile: {
                include: {
                  user: {
                    select: {
                      email: true,
                    },
                  },
                },
              },
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
      {/* Premium Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 md:p-8 text-white shadow-lg">
        <div className="relative z-10 space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">My Children</h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-xl">
            Track academic progress, check attendance stats, view outstanding fees, and access detailed information for your children.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10">
          <GraduationCap className="h-64 w-64" />
        </div>
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
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader className="relative pb-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                    <AvatarFallback className="text-lg bg-linear-to-br from-blue-500 to-indigo-600 text-white font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg font-bold truncate">
                      {student.profile.firstName} {student.profile.lastName}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                        {student.status}
                      </Badge>
                      {gs.isPrimary && (
                        <Badge className="bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20 text-[10px] px-1.5 py-0 border border-indigo-200/50">
                          Primary Guardian
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Basic & Academic Info */}
                <div className="grid grid-cols-2 gap-3 text-xs border-b border-border/50 pb-4">
                  <div>
                    <p className="text-muted-foreground font-semibold">Student ID</p>
                    <p className="font-mono font-bold text-foreground mt-0.5 break-all">{student.studentId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold">Class</p>
                    <p className="font-bold text-foreground mt-0.5">{student.class?.name || "No Class"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground font-semibold">Portal Username</p>
                    <p className="font-mono text-primary font-bold mt-0.5 break-all">{student.profile.user.email}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  {student.admissionNumber && (
                    <div className="flex items-center justify-between">
                      <span>Admission No:</span>
                      <span className="font-mono font-bold text-foreground">{student.admissionNumber}</span>
                    </div>
                  )}
                  {student.department && (
                    <div className="flex items-center justify-between">
                      <span>Department:</span>
                      <span className="font-bold text-foreground">{student.department.name}</span>
                    </div>
                  )}
                  {student.house && (
                    <div className="flex items-center justify-between">
                      <span>House:</span>
                      <span className="font-bold text-foreground">{student.house.name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Date of Birth:</span>
                    <span className="font-bold text-foreground">
                      {new Date(student.profile.dateOfBirth).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-lg p-2 text-center transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30">
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {student._count.attendances}
                    </p>
                    <p className="text-[10px] font-semibold text-muted-foreground">Attendance</p>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 rounded-lg p-2 text-center transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {student._count.assessmentScores}
                    </p>
                    <p className="text-[10px] font-semibold text-muted-foreground">Assessments</p>
                  </div>
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 rounded-lg p-2 text-center transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/30">
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {student._count.bills}
                    </p>
                    <p className="text-[10px] font-semibold text-muted-foreground">Bills</p>
                  </div>
                </div>

                {/* View Details Button */}
                <Link
                  href={`/${schoolSlug}/guardian/children/${student.id}`}
                  className="block pt-2"
                >
                  <Button className="w-full h-9 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium gap-1.5" variant="default">
                    View Full Profile
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {guardian.students.length === 0 && (
        <Card className="rounded-xl border border-dashed border-border/80">
          <CardContent className="py-16">
            <div className="text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/60" />
              <h3 className="mt-4 text-lg font-bold">No children found</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                No students are currently linked to your guardian account. Please contact the administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
