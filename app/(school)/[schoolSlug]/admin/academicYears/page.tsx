// app/(school)/[schoolSlug]/admin/academic-years/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Plus, Calendar, Settings2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AcademicYearDialog } from "@/components/school/academic-years/academic-year-dialog";
import { SetGlobalYearTermButton } from "@/components/school/academic-years/set-global-year-term-button";
import { DeleteAcademicYearButton } from "@/components/school/academic-years/delete-academic-year-button";
import { TermDialog } from "@/components/school/academic-years/term-dialog";
import { DeleteTermButton } from "@/components/school/academic-years/delete-term-button";
import { TermTransitionCard } from "@/components/school/academic-years/term-transition-card";

interface AcademicYearsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AcademicYearsPage(props: AcademicYearsPageProps) {
  const params = await props.params;
  const { schoolSlug } = params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  // Check authorization
  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Fetch school with academic years and terms
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      academicYears: {
        include: {
          terms: {
            orderBy: { termNumber: "asc" },
          },
          _count: {
            select: {
              classes: true,
              enrollments: true,
              bills: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
      },
      organization: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!school) {
    redirect("/");
  }

  // Get global settings from school settings JSON
  interface SchoolSettings {
    currentAcademicYearId?: string;
    currentTermId?: string;
    lastUpdatedBy?: string;
    lastUpdatedAt?: string;
  }

  const globalSettings = (school.settings as SchoolSettings) || {};
  const globalAcademicYearId = globalSettings.currentAcademicYearId;
  const globalTermId = globalSettings.currentTermId;

  const globalAcademicYear = school.academicYears.find(
    (year) => year.id === globalAcademicYearId,
  );
  const globalTerm = globalAcademicYear?.terms.find(
    (term) => term.id === globalTermId,
  );

  const canManageGlobal =
    role?.effectiveRole === "admin" ||
    role?.effectiveRole === "owner" ||
    session.isSuperAdmin;

  const now = new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-muted/50">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight ">
              Academic Years & Terms
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage academic years, terms, and system-wide settings
            </p>
          </div>
          <AcademicYearDialog
            schoolId={school.id}
            schoolSlug={schoolSlug}
            organizationId={school.organizationId}
          >
            <Button
              size="lg"
              className="shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Academic Year
            </Button>
          </AcademicYearDialog>
        </div>

        {/* Global Settings Card */}
        {canManageGlobal && (
          <Card className="border-2 border-primary/20 bg-card/80 backdrop-blur-xl shadow-2xl">
            <CardHeader className="">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <CardTitle>Global System Settings</CardTitle>
              </div>
              <CardDescription>
                Set the default academic year and term for all users. Students,
                teachers, and staff will see data from these settings by
                default.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Current Global Academic Year
                    </p>
                    <p className="text-lg font-semibold">
                      {globalAcademicYear?.name || "Not Set"}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-sm font-medium text-muted-foreground">
                      Current Global Term
                    </p>
                    <p className="text-lg font-semibold">
                      {globalTerm?.name || "Not Set"}
                    </p>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    <span className="font-medium">Note:</span> Admins and owners
                    can temporarily switch to different years/terms in their
                    session without affecting other users.
                  </AlertDescription>
                </Alert>

                <SetGlobalYearTermButton
                  schoolId={school.id}
                  schoolSlug={schoolSlug}
                  organizationId={school.organizationId}
                  academicYears={school.academicYears.map((year) => ({
                    ...year,
                    terms: year.terms.map((term) => ({
                      ...term,
                      startDate: term.startDate,
                      endDate: term.endDate,
                    })),
                  }))}
                  currentYearId={globalAcademicYearId}
                  currentTermId={globalTermId}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Term Transition Card */}
        {canManageGlobal && <TermTransitionCard />}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Academic Years
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {school.academicYears.length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Terms</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {school.academicYears.reduce(
                  (sum, year) => sum + year.terms.length,
                  0,
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Classes
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {school.academicYears.reduce(
                  (sum, year) => sum + year._count.classes,
                  0,
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Academic Years List */}
        {school.academicYears.length === 0 ? (
          <Card className="border-0 bg-card/60 backdrop-blur-xl shadow-xl">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No academic years yet
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first academic year to get started
              </p>
              <AcademicYearDialog
                schoolId={school.id}
                schoolSlug={schoolSlug}
                organizationId={school.organizationId}
              >
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Academic Year
                </Button>
              </AcademicYearDialog>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {school.academicYears.map((year) => {
              const isGlobal = year.id === globalAcademicYearId;

              return (
                <Card
                  key={year.id}
                  className={`border-0 bg-card/60 backdrop-blur-xl shadow-xl transition-all duration-300 ${
                    isGlobal ? "ring-2 ring-primary/50" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <CardTitle className="text-xl sm:text-2xl">
                            {year.name}
                          </CardTitle>
                          {isGlobal && (
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              Global Default
                            </Badge>
                          )}
                          {(() => {
                            const startDate = new Date(year.startDate);
                            const endDate = new Date(year.endDate);
                            const isUpcoming = startDate > now;
                            const isExpired = endDate < now;
                            const isActive = startDate <= now && endDate >= now;

                            if (isGlobal) {
                              return <Badge variant="default">Current</Badge>;
                            }

                            if (isUpcoming) {
                              return (
                                <Badge variant="secondary">Upcoming</Badge>
                              );
                            }

                            if (isActive) {
                              return (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500 text-emerald-500"
                                >
                                  Active
                                </Badge>
                              );
                            }

                            return <Badge variant="outline">Past</Badge>;
                          })()}
                        </div>
                        <CardDescription className="text-xs sm:text-sm">
                          {new Date(year.startDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}{" "}
                          -{" "}
                          {new Date(year.endDate).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <AcademicYearDialog
                          schoolId={school.id}
                          schoolSlug={schoolSlug}
                          organizationId={school.organizationId}
                          initialData={year}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none"
                          >
                            Edit Year
                          </Button>
                        </AcademicYearDialog>

                        <DeleteAcademicYearButton
                          yearId={year.id}
                          yearName={year.name}
                          schoolSlug={schoolSlug}
                          hasClasses={year._count.classes > 0}
                          hasEnrollments={year._count.enrollments > 0}
                          isGlobal={isGlobal}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Year Stats */}
                      <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            Classes
                          </p>
                          <p className="text-2xl font-bold">
                            {year._count.classes}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            Enrollments
                          </p>
                          <p className="text-2xl font-bold">
                            {year._count.enrollments}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Bills</p>
                          <p className="text-2xl font-bold">
                            {year._count.bills}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      {/* Terms Section */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold">Terms</h3>
                          <TermDialog
                            academicYearId={year.id}
                            academicYearName={year.name}
                            academicYearStartDate={year.startDate}
                            academicYearEndDate={year.endDate}
                            schoolSlug={schoolSlug}
                            existingTerms={year.terms}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Term
                            </Button>
                          </TermDialog>
                        </div>

                        {year.terms.length === 0 ? (
                          <div className="text-center py-8 rounded-lg border-2 border-dashed">
                            <p className="text-sm text-muted-foreground">
                              No terms created yet
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {year.terms.map((term) => {
                              const isGlobalTerm =
                                term.id === globalTermId && isGlobal;

                              return (
                                <div
                                  key={term.id}
                                  className={`p-4 rounded-lg border bg-background/50 transition-all duration-200 hover:shadow-md ${
                                    isGlobalTerm ? "ring-2 ring-primary/50" : ""
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold">
                                          {term.name}
                                        </h4>
                                        {isGlobalTerm && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            Current
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Term {term.termNumber}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {new Date(
                                      term.startDate,
                                    ).toLocaleDateString()}{" "}
                                    -{" "}
                                    {new Date(
                                      term.endDate,
                                    ).toLocaleDateString()}
                                  </p>
                                  <div className="flex gap-2">
                                    <TermDialog
                                      academicYearId={year.id}
                                      academicYearName={year.name}
                                      academicYearStartDate={year.startDate}
                                      academicYearEndDate={year.endDate}
                                      schoolSlug={schoolSlug}
                                      existingTerms={year.terms}
                                      initialData={term}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1"
                                      >
                                        Edit
                                      </Button>
                                    </TermDialog>
                                    <DeleteTermButton
                                      termId={term.id}
                                      termName={term.name}
                                      schoolSlug={schoolSlug}
                                      isGlobal={isGlobalTerm}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
