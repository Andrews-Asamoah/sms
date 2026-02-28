// app/(school)/[schoolSlug]/guardian/children/[childId]/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  FileText,
  DollarSign,
  ClipboardCheck,
  Heart,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Decimal } from "@/lib/generated/prisma/runtime/client";

interface GuardianChildDetailsPageProps {
  params: Promise<{
    schoolSlug: string;
    childId: string;
  }>;
}

// Helper function to safely convert Decimal to number
function decimalToNumber(value: Decimal | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value.toString());
}

export default async function GuardianChildDetailsPage({
  params,
}: GuardianChildDetailsPageProps) {
  const { schoolSlug, childId } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  // Get guardian
  const guardian = await prisma.guardian.findFirst({
    where: {
      schoolId: school.id,
      profile: {
        userId: session.user.id,
      },
    },
  });

  if (!guardian) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Get student with full details
  const student = await prisma.student.findFirst({
    where: {
      id: childId,
      guardians: {
        some: {
          guardianId: guardian.id,
        },
      },
    },
    include: {
      profile: true,
      class: {
        include: {
          academicYear: true,
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
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
      attendances: {
        orderBy: {
          date: "desc",
        },
        take: 10,
      },
      assessmentScores: {
        include: {
          subject: true,
          term: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
    },
  });

  if (!student) {
    notFound();
  }

  const initials =
    `${student.profile.firstName.charAt(0)}${student.profile.lastName.charAt(0)}`.toUpperCase();

  // Calculate stats
  const totalBills = student.bills.length;
  const outstandingAmount = student.bills
    .filter((b) => b.status !== "PAID" && b.status !== "CANCELLED")
    .reduce((sum, bill) => sum + decimalToNumber(bill.balanceAmount), 0);

  const attendanceStats = student.attendances.reduce(
    (stats, att) => {
      stats[att.status] = (stats[att.status] || 0) + 1;
      return stats;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href={`/${schoolSlug}/guardian/children`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Children
        </Button>
      </Link>

      {/* Student Header */}
      <Card>
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
                <Badge variant="outline" className="bg-green-500/10">
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
                      Admission No
                    </p>
                    <p className="font-mono font-semibold">
                      {student.admissionNumber}
                    </p>
                  </div>
                )}
                {student.class && (
                  <div>
                    <p className="text-sm text-muted-foreground">Class</p>
                    <p className="font-semibold">{student.class.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Admitted</p>
                  <p className="font-semibold">
                    {new Date(student.admissionDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {school.currency} {outstandingAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">{totalBills} bills</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceStats.PRESENT || 0}
            </div>
            <p className="text-xs text-muted-foreground">Present this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {student.assessmentScores.length}
            </div>
            <p className="text-xs text-muted-foreground">Recorded scores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Age</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(
                (new Date().getTime() -
                  new Date(student.profile.dateOfBirth).getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000),
              )}
            </div>
            <p className="text-xs text-muted-foreground">years old</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">
                    {student.profile.firstName}{" "}
                    {student.profile.otherNames && (
                      <span>{student.profile.otherNames} </span>
                    )}
                    {student.profile.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">
                    {student.profile.gender.toLowerCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {new Date(student.profile.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nationality</p>
                  <p className="font-medium">
                    {student.profile.nationality || "Not specified"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Contact & Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {student.profile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{student.profile.phone}</p>
                    </div>
                  </div>
                )}
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
              </CardContent>
            </Card>
          </div>

          {/* Guardians */}
          <Card>
            <CardHeader>
              <CardTitle>Guardians</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {student.guardians.map((gs) => (
                  <div
                    key={gs.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-semibold">
                        {gs.guardian.firstName} {gs.guardian.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {gs.guardian.relationshipType.toLowerCase()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {gs.isPrimary && (
                        <Badge variant="secondary">Primary</Badge>
                      )}
                      {gs.canPickup && (
                        <Badge variant="outline">Can Pickup</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Information Tab */}
        <TabsContent value="academic" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Academic Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {student.class && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Current Class
                    </p>
                    <p className="font-semibold">{student.class.name}</p>
                  </div>
                )}
                {student.department && (
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-semibold">{student.department.name}</p>
                  </div>
                )}
                {student.house && (
                  <div>
                    <p className="text-sm text-muted-foreground">House</p>
                    <p className="font-semibold">{student.house.name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {student.attendances.slice(0, 5).map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">
                      {new Date(att.date).toLocaleDateString()}
                    </span>
                    <Badge
                      variant={
                        att.status === "PRESENT" ? "default" : "secondary"
                      }
                    >
                      {att.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recent Assessments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              {student.assessmentScores.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No assessments recorded yet
                </p>
              ) : (
                <div className="space-y-3">
                  {student.assessmentScores.map((score) => (
                    <div
                      key={score.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-semibold">{score.subject.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {score.term.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {decimalToNumber(score.percentage).toFixed(1)}%
                        </p>
                        {score.grade && (
                          <Badge variant="outline">{score.grade}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Recent Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {student.bills.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No bills found
                </p>
              ) : (
                <div className="space-y-3">
                  {student.bills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{bill.billNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          Issued: {new Date(bill.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {school.currency}{" "}
                          {decimalToNumber(bill.balanceAmount).toFixed(2)}
                        </p>
                        <Badge
                          variant={
                            bill.status === "PAID" ? "default" : "secondary"
                          }
                        >
                          {bill.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href={`/${schoolSlug}/guardian/fees`}>
                <Button className="w-full mt-4" variant="outline">
                  View All Bills
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card>
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
                  <p className="font-semibold">{student.bloodGroup}</p>
                </div>
              )}
              {student.allergies && (
                <div>
                  <p className="text-sm text-muted-foreground">Allergies</p>
                  <p className="font-semibold">{student.allergies}</p>
                </div>
              )}
              {student.medicalConditions && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Medical Conditions
                  </p>
                  <p className="font-semibold">{student.medicalConditions}</p>
                </div>
              )}
              {!student.bloodGroup &&
                !student.allergies &&
                !student.medicalConditions && (
                  <p className="text-center text-muted-foreground py-8">
                    No medical information on file
                  </p>
                )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {student.profile.emergencyContactName && (
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold">
                    {student.profile.emergencyContactName}
                  </p>
                </div>
              )}
              {student.profile.emergencyContactPhone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-semibold">
                    {student.profile.emergencyContactPhone}
                  </p>
                </div>
              )}
              {student.profile.emergencyRelationship && (
                <div>
                  <p className="text-sm text-muted-foreground">Relationship</p>
                  <p className="font-semibold">
                    {student.profile.emergencyRelationship}
                  </p>
                </div>
              )}
              {!student.profile.emergencyContactName && (
                <p className="text-center text-muted-foreground py-8">
                  No emergency contact on file
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
