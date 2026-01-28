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
        include: { academicYear: true },
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
        <Link href={`/${schoolSlug}/admin/students/${studentId}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Student
          </Button>
        </Link>
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

        {/* Guardians Tab */}
        <TabsContent value="guardians">
          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Guardians ({student.guardians.length})
              </CardTitle>
              <CardDescription>
                Parents and guardians responsible for the student
              </CardDescription>
            </CardHeader>
            <CardContent>
              {student.guardians.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No guardians registered yet
                </p>
              ) : (
                <div className="space-y-4">
                  {student.guardians.map((gs) => (
                    <div
                      key={gs.id}
                      className="flex items-start justify-between p-4 rounded-lg border"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {gs.guardian.firstName} {gs.guardian.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {gs.guardian.relationshipType}
                        </p>
                        {gs.guardian.phone && (
                          <p className="text-sm">{gs.guardian.phone}</p>
                        )}
                        {gs.guardian.email && (
                          <p className="text-sm text-muted-foreground">
                            {gs.guardian.email}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {gs.isPrimary && (
                          <Badge variant="outline">Primary</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Tab */}
        <TabsContent value="academic">
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
                          {school.currency} {bill.totalAmount.toString()}
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
