// app/(school)/[schoolSlug]/admin/students/[studentId]/page.tsx

import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Edit,
  Phone,
  MapPin,
  Heart,
  Users,
  FileText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddGuardianDialog } from "@/components/school/students/add-guardian-dialog";
import { ResetPasswordDialog } from "@/components/school/students/reset-password-dialog";
import { Decimal } from "@/lib/generated/prisma/runtime/client";

// Helper function to safely convert Decimal to string
function decimalToString(value: Decimal | string | null): string {
  if (!value) return "0";
  if (typeof value === "string") return value;
  return value.toString();
}

interface StudentDetailPageProps {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-700 border-green-200",
  GRADUATED: "bg-blue-500/10 text-blue-700 border-blue-200",
  WITHDRAWN: "bg-orange-500/10 text-orange-700 border-orange-200",
  SUSPENDED: "bg-red-500/10 text-red-700 border-red-200",
};

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const { schoolSlug, studentId } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (!role) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
      schoolId: school.id,
    },
    include: {
      profile: true,
      class: {
        include: {
          academicYear: true,
          subjects: {
            include: {
              subject: true,
              teacher: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
      },
      department: true,
      house: true,
      guardians: {
        include: {
          guardian: true,
        },
      },
      bills: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
      enrollments: {
        include: {
          class: true,
          academicYear: true,
        },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });

  if (!student) {
    notFound();
  }

  const initials =
    `${student.profile.firstName.charAt(0)}${student.profile.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${schoolSlug}/admin/students`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Student Profile
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage student information
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ResetPasswordDialog
            studentId={student.id}
            studentName={`${student.profile.firstName} ${student.profile.lastName}`}
            schoolSlug={schoolSlug}
          />
          <Link href={`/${schoolSlug}/admin/students/${studentId}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Student
            </Button>
          </Link>
        </div>
      </div>

      {/* Student Header Card */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    {student.profile.firstName} {student.profile.lastName}
                  </h2>
                  {student.profile.otherNames && (
                    <p className="text-muted-foreground">
                      {student.profile.otherNames}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={statusColors[student.status]}
                >
                  {student.status}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student ID</p>
                  <p className="font-mono font-semibold">{student.studentId}</p>
                </div>
                {student.admissionNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Admission No.
                    </p>
                    <p className="font-semibold">{student.admissionNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-semibold">
                    {student.class?.name || "Not assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-semibold capitalize">
                    {student.profile.gender.toLowerCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Personal Information */}
            <Card className="backdrop-blur-sm bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {new Date(student.profile.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nationality</p>
                  <p className="font-medium">{student.profile.nationality}</p>
                </div>
                {student.profile.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{student.profile.phone}</p>
                  </div>
                )}
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Admission Date
                  </p>
                  <p className="font-medium">
                    {new Date(student.admissionDate).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card className="backdrop-blur-sm bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {student.profile.residentialAddress && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Residential Address
                    </p>
                    <p className="font-medium">
                      {student.profile.residentialAddress}
                    </p>
                  </div>
                )}
                {student.profile.city && (
                  <div>
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">{student.profile.city}</p>
                  </div>
                )}
                {student.profile.region && (
                  <div>
                    <p className="text-sm text-muted-foreground">Region</p>
                    <p className="font-medium">{student.profile.region}</p>
                  </div>
                )}
                {student.profile.country && (
                  <div>
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="font-medium">{student.profile.country}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card className="backdrop-blur-sm bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {student.bloodGroup && (
                  <div>
                    <p className="text-sm text-muted-foreground">Blood Group</p>
                    <p className="font-medium">{student.bloodGroup}</p>
                  </div>
                )}
                {student.allergies && (
                  <div>
                    <p className="text-sm text-muted-foreground">Allergies</p>
                    <p className="font-medium">{student.allergies}</p>
                  </div>
                )}
                {student.medicalConditions && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Medical Conditions
                    </p>
                    <p className="font-medium">{student.medicalConditions}</p>
                  </div>
                )}
                {!student.bloodGroup &&
                  !student.allergies &&
                  !student.medicalConditions && (
                    <p className="text-sm text-muted-foreground">
                      No medical information recorded
                    </p>
                  )}
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="backdrop-blur-sm bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {student.profile.emergencyContactName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {student.profile.emergencyContactName}
                    </p>
                  </div>
                )}
                {student.profile.emergencyContactPhone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">
                      {student.profile.emergencyContactPhone}
                    </p>
                  </div>
                )}
                {student.profile.emergencyRelationship && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Relationship
                    </p>
                    <p className="font-medium">
                      {student.profile.emergencyRelationship}
                    </p>
                  </div>
                )}
                {!student.profile.emergencyContactName && (
                  <p className="text-sm text-muted-foreground">
                    No emergency contact recorded
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Guardians Tab - ENHANCED WITH ADD BUTTON */}
        <TabsContent value="guardians">
          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Guardians ({student.guardians.length})
                  </CardTitle>
                  <CardDescription>
                    Parents and guardians responsible for the student
                  </CardDescription>
                </div>
                <AddGuardianDialog
                  studentId={student.id}
                  studentName={`${student.profile.firstName} ${student.profile.lastName}`}
                  schoolId={school.id}
                  schoolSlug={schoolSlug}
                  organizationId={school.organizationId}
                />
              </div>
            </CardHeader>
            <CardContent>
              {student.guardians.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No guardians registered yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click &quot;Add Guardian&quot; above to register a parent or
                    guardian
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {student.guardians.map((gs) => (
                    <div
                      key={gs.id}
                      className="flex items-start justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg">
                            {gs.guardian.firstName} {gs.guardian.lastName}
                          </p>
                          {gs.isPrimary && (
                            <Badge variant="default" className="text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground capitalize">
                            {gs.guardian.relationshipType
                              .toLowerCase()
                              .replace("_", " ")}
                          </p>
                          {gs.guardian.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3" />
                              <span>{gs.guardian.phone}</span>
                            </div>
                          )}
                          {gs.guardian.email && (
                            <p className="text-sm text-muted-foreground">
                              {gs.guardian.email}
                            </p>
                          )}
                        </div>
                        {(gs.guardian.occupation || gs.guardian.employer) && (
                          <div className="pt-2 border-t space-y-1">
                            {gs.guardian.occupation && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Occupation:
                                </span>{" "}
                                {gs.guardian.occupation}
                              </p>
                            )}
                            {gs.guardian.employer && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Employer:
                                </span>{" "}
                                {gs.guardian.employer}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <div className="flex flex-wrap gap-2 justify-end">
                          {gs.canPickup && (
                            <Badge variant="outline" className="text-xs">
                              Can Pickup
                            </Badge>
                          )}
                          {gs.receiveReports && (
                            <Badge variant="outline" className="text-xs">
                              Reports
                            </Badge>
                          )}
                          {gs.receiveAlerts && (
                            <Badge variant="outline" className="text-xs">
                              Alerts
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-4">
          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Current Class Subjects</CardTitle>
              <CardDescription>
                Subjects assigned to {student.class?.name || "current class"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!student.class?.subjects ||
              student.class.subjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No subjects assigned to this class
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {student.class.subjects.map((cs) => (
                    <div
                      key={cs.id}
                      className="p-4 rounded-lg border bg-background/50 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold">{cs.subject.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {cs.subject.code}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        {cs.teacher ? (
                          <div className="flex flex-col items-end">
                            <span className="text-muted-foreground text-xs italic">
                              Teacher
                            </span>
                            <span>
                              {cs.teacher.profile?.firstName}{" "}
                              {cs.teacher.profile?.lastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">
                            No teacher assigned
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Academic History</CardTitle>
              <CardDescription>Enrollment and class history</CardDescription>
            </CardHeader>
            <CardContent>
              {student.enrollments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No enrollment history yet
                </p>
              ) : (
                <div className="space-y-4">
                  {student.enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <p className="font-semibold">{enrollment.class.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {enrollment.academicYear.name}
                        </p>
                      </div>
                      <Badge variant="outline">{enrollment.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Recent Bills</CardTitle>
              <CardDescription>Latest billing information</CardDescription>
            </CardHeader>
            <CardContent>
              {student.bills.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No bills generated yet
                </p>
              ) : (
                <div className="space-y-4">
                  {student.bills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <p className="font-semibold">{bill.billNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(bill.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {school.currency} {decimalToString(bill.totalAmount)}
                        </p>
                        <Badge variant="outline">{bill.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
