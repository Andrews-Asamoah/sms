// app/(school)/[schoolSlug]/guardian/children/[childId]/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
type Decimal = { toNumber(): number } | number;

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
      profile: {
        include: {
          user: true,
        },
      },
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
      <div className="flex items-center justify-between">
        <Link href={`/${schoolSlug}/guardian/children`}>
          <Button variant="ghost" size="sm" className="hover:bg-muted/80 rounded-lg">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Children
          </Button>
        </Link>
      </div>

      {/* Student Header */}
      <Card className="overflow-hidden border border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
            <Avatar className="h-20 w-20 ring-4 ring-primary/10">
              <AvatarFallback className="text-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white font-black">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    {student.profile.firstName} {student.profile.lastName}
                  </h2>
                  {student.profile.otherNames && (
                    <p className="text-muted-foreground text-sm font-medium mt-0.5">
                      {student.profile.otherNames}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="self-center sm:self-start bg-emerald-500/10 text-emerald-750 border-emerald-200/50 text-xs px-2.5 py-0.5 font-semibold">
                  {student.status}
                </Badge>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-border/50 pt-5 text-left">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Student ID</p>
                  <p className="font-mono font-bold text-foreground mt-0.5 break-all">{student.studentId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Username</p>
                  <p className="font-mono font-bold text-primary mt-0.5 break-all">{student.profile.user?.email}</p>
                </div>
                {student.admissionNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Admission No</p>
                    <p className="font-mono font-bold text-foreground mt-0.5 break-all">{student.admissionNumber}</p>
                  </div>
                )}
                {student.class && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Class</p>
                    <p className="font-bold text-foreground mt-0.5">{student.class.name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border border-amber-100/80 dark:border-amber-900/30 bg-amber-50/10 dark:bg-amber-950/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-50">
              {school.currency} {outstandingAmount.toFixed(2)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{totalBills} bills active</p>
          </CardContent>
        </Card>

        <Card className="border border-blue-100/80 dark:border-blue-900/30 bg-blue-50/10 dark:bg-blue-950/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Attendance</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-50">
              {attendanceStats.PRESENT || 0}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Days present</p>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100/80 dark:border-emerald-900/30 bg-emerald-50/10 dark:bg-emerald-950/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Assessments</CardTitle>
            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-50">
              {student.assessmentScores.length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Recorded scores</p>
          </CardContent>
        </Card>

        <Card className="border border-purple-100/80 dark:border-purple-900/30 bg-purple-50/10 dark:bg-purple-950/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Age</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-black text-purple-950 dark:text-purple-50">
              {Math.floor(
                (new Date().getTime() -
                  new Date(student.profile.dateOfBirth).getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000),
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">years old</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="w-full flex h-auto p-1 bg-muted/80 gap-1 rounded-xl">
          <TabsTrigger value="personal" className="flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg">Personal Info</TabsTrigger>
          <TabsTrigger value="academic" className="flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg">Academic</TabsTrigger>
          <TabsTrigger value="financial" className="flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg">Financial</TabsTrigger>
          <TabsTrigger value="health" className="flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg">Health</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {student.profile.firstName}{" "}
                    {student.profile.otherNames && (
                      <span>{student.profile.otherNames} </span>
                    )}
                    {student.profile.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="font-semibold capitalize text-foreground mt-0.5">
                    {student.profile.gender.toLowerCase()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {new Date(student.profile.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nationality</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {student.profile.nationality || "Not specified"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  Contact & Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {student.profile.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-semibold text-foreground mt-0.5">{student.profile.phone}</p>
                    </div>
                  </div>
                )}
                {student.profile.residentialAddress && (
                  <div>
                    <p className="text-xs text-muted-foreground">Residential Address</p>
                    <p className="font-semibold text-foreground mt-0.5">{student.profile.residentialAddress}</p>
                  </div>
                )}
                {student.profile.city && (
                  <div>
                    <p className="text-xs text-muted-foreground">City</p>
                    <p className="font-semibold text-foreground mt-0.5">{student.profile.city}</p>
                  </div>
                )}
                {student.profile.region && (
                  <div>
                    <p className="text-xs text-muted-foreground">Region</p>
                    <p className="font-semibold text-foreground mt-0.5">{student.profile.region}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Guardians */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked Guardians</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {student.guardians.map((gs) => (
                  <div
                    key={gs.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20"
                  >
                    <div>
                      <p className="font-bold text-sm">
                        {gs.guardian.firstName} {gs.guardian.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {gs.guardian.relationshipType.toLowerCase()}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {gs.isPrimary && (
                        <Badge className="bg-indigo-500/10 text-indigo-700 border border-indigo-200/40 text-[10px]">Primary</Badge>
                      )}
                      {gs.canPickup && (
                        <Badge variant="outline" className="text-[10px]">Can Pickup</Badge>
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                  Academic Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {student.class && (
                  <div>
                    <p className="text-xs text-muted-foreground">Current Class</p>
                    <p className="font-bold text-foreground mt-0.5">{student.class.name}</p>
                  </div>
                )}
                {student.department && (
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="font-bold text-foreground mt-0.5">{student.department.name}</p>
                  </div>
                )}
                {student.house && (
                  <div>
                    <p className="text-xs text-muted-foreground">House</p>
                    <p className="font-bold text-foreground mt-0.5">{student.house.name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Attendance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {student.attendances.slice(0, 5).map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0"
                  >
                    <span>
                      {new Date(att.date).toLocaleDateString()}
                    </span>
                    <Badge
                      className={cn(
                        "text-[10px] px-1.5",
                        att.status === "PRESENT"
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-200/50"
                          : "bg-amber-500/10 text-amber-700 border border-amber-200/50"
                      )}
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
              <CardTitle className="text-base">Recent Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              {student.assessmentScores.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  No assessments recorded yet
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {student.assessmentScores.map((score) => (
                    <div
                      key={score.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20"
                    >
                      <div>
                        <p className="font-bold text-sm text-foreground">{score.subject.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {score.term.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-foreground">
                          {decimalToNumber(score.percentage).toFixed(1)}%
                        </p>
                        {score.grade && (
                          <Badge variant="outline" className="text-[10px] mt-0.5 font-bold">{score.grade}</Badge>
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
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-primary shrink-0" />
                Recent Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {student.bills.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  No bills found
                </p>
              ) : (
                <div className="space-y-3">
                  {student.bills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border/85"
                    >
                      <div>
                        <p className="font-bold text-sm text-foreground">{bill.billNumber}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Issued: {new Date(bill.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm text-foreground">
                          {school.currency}{" "}
                          {decimalToNumber(bill.balanceAmount).toFixed(2)}
                        </p>
                        <Badge
                          className={cn(
                            "text-[10px] mt-1",
                            bill.status === "PAID"
                              ? "bg-emerald-500/10 text-emerald-700"
                              : "bg-amber-500/10 text-amber-700"
                          )}
                        >
                          {bill.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href={`/${schoolSlug}/guardian/fees`}>
                <Button className="w-full mt-4 h-9 font-medium" variant="outline">
                  View All Bills & Make Payments
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Heart className="h-4 w-4 text-primary shrink-0" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-sm">
                {student.bloodGroup && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Blood Group</p>
                    <p className="font-bold text-foreground mt-0.5">{student.bloodGroup}</p>
                  </div>
                )}
                {student.allergies && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Allergies</p>
                    <p className="font-bold text-foreground mt-0.5">{student.allergies}</p>
                  </div>
                )}
                {student.medicalConditions && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Medical Conditions</p>
                    <p className="font-bold text-foreground mt-0.5">{student.medicalConditions}</p>
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-primary shrink-0" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-sm">
                {student.profile.emergencyContactName && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Name</p>
                    <p className="font-bold text-foreground mt-0.5">
                      {student.profile.emergencyContactName}
                    </p>
                  </div>
                )}
                {student.profile.emergencyContactPhone && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Phone</p>
                    <p className="font-bold text-foreground mt-0.5">
                      {student.profile.emergencyContactPhone}
                    </p>
                  </div>
                )}
                {student.profile.emergencyRelationship && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Relationship</p>
                    <p className="font-bold text-foreground mt-0.5">
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
