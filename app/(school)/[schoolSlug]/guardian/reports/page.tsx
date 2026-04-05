import { requireSchoolAccess } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, ChevronRight, GraduationCap, BookOpen } from "lucide-react";

interface GuardianReportsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function GuardianReportsPage({
  params,
}: GuardianReportsPageProps) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) redirect("/");

  const guardian = await prisma.guardian.findFirst({
    where: {
      schoolId: school.id,
      profile: { userId: session.user.id },
    },
    include: {
      students: {
        include: {
          student: {
            include: {
              profile: true,
              class: true,
              reportCards: {
                where: { publishedAt: { not: null } },
                include: {
                  set: {
                    include: {
                      academicYear: { select: { name: true } },
                      term: { select: { name: true, termNumber: true } },
                    },
                  },
                },
                orderBy: { publishedAt: "desc" },
              },
            },
          },
        },
      },
    },
  });

  if (!guardian) redirect(`/${schoolSlug}/unauthorized`);

  const children = guardian.students.map((gs) => gs.student);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-primary" />
          Academic Report Cards
        </h1>
        <p className="text-muted-foreground mt-1">
          View published term report cards for your children
        </p>
      </div>

      {children.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
          <h3 className="font-semibold text-lg">No children linked</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Contact school administration to link your children to your account.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {children.map((student) => {
            const reports = student.reportCards;
            // Group reports by academic year
            const byYear: Record<string, typeof reports> = {};
            for (const rc of reports) {
              const yearName = rc.set.academicYear.name;
              if (!byYear[yearName]) byYear[yearName] = [];
              byYear[yearName].push(rc);
            }
            const initials = `${student.profile.firstName.charAt(0)}${student.profile.lastName.charAt(0)}`.toUpperCase();

            return (
              <Card key={student.id} className="overflow-hidden shadow-sm">
                {/* Student header */}
                <CardHeader className="border-b bg-muted/30 pb-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {student.profile.firstName} {student.profile.lastName}
                      </CardTitle>
                      <CardDescription>
                        {student.class?.name ?? "No class assigned"} •{" "}
                        {student.studentId}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      {reports.length} Report{reports.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {reports.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      No published report cards yet.
                    </div>
                  ) : (
                    Object.entries(byYear).map(([year, yearReports]) => (
                      <div key={year}>
                        <div className="px-6 py-2 bg-muted/20 border-y text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {year}
                        </div>
                        <div className="divide-y">
                          {yearReports.map((rc) => (
                            <Link
                              key={rc.id}
                              href={`/${schoolSlug}/guardian/reports/${student.id}/${rc.setId}`}
                              className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">
                                    {rc.set.term.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Published{" "}
                                    {new Date(
                                      rc.publishedAt!,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {(rc.data as any)?.average != null && (
                                  <Badge
                                    variant="secondary"
                                    className="font-semibold"
                                  >
                                    Avg: {Math.round((rc.data as any).average)}%
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 opacity-70 group-hover:opacity-100"
                                >
                                  View
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
