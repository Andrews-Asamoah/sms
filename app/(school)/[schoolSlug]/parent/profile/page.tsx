// app/(school)/[schoolSlug]/parent/profile/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Users,
  Shield,
} from "lucide-react";

interface ParentProfilePageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function ParentProfilePage({
  params,
}: ParentProfilePageProps) {
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
      profile: {
        include: {
          user: true,
        },
      },
      students: {
        include: {
          student: {
            include: {
              profile: true,
              class: true,
            },
          },
        },
      },
    },
  });

  if (!guardian) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const initials =
    guardian.firstName && guardian.lastName
      ? `${guardian.firstName.charAt(0)}${guardian.lastName.charAt(0)}`.toUpperCase()
      : "GU";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your account information
        </p>
      </div>

      {/* Profile Header Card */}
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
                    {guardian.firstName} {guardian.lastName}
                  </h2>
                  {guardian.otherNames && (
                    <p className="text-muted-foreground">
                      {guardian.otherNames}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="bg-green-500/10">
                  {guardian.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Guardian ID</p>
                  <p className="font-mono font-semibold">
                    {guardian.guardianId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Relationship</p>
                  <p className="font-semibold capitalize">
                    {guardian.relationshipType.toLowerCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Children</p>
                  <p className="font-semibold">{guardian.students.length}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{guardian.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Primary Phone</p>
                <p className="font-medium">{guardian.phone}</p>
              </div>
            </div>
            {guardian.alternatePhone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Alternate Phone
                  </p>
                  <p className="font-medium">{guardian.alternatePhone}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {guardian.residentialAddress && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Residential Address
                </p>
                <p className="font-medium">{guardian.residentialAddress}</p>
              </div>
            )}
            {guardian.city && (
              <div>
                <p className="text-sm text-muted-foreground">City</p>
                <p className="font-medium">{guardian.city}</p>
              </div>
            )}
            {guardian.region && (
              <div>
                <p className="text-sm text-muted-foreground">Region</p>
                <p className="font-medium">{guardian.region}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Employment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {guardian.occupation && (
              <div>
                <p className="text-sm text-muted-foreground">Occupation</p>
                <p className="font-medium">{guardian.occupation}</p>
              </div>
            )}
            {guardian.employer && (
              <div>
                <p className="text-sm text-muted-foreground">Employer</p>
                <p className="font-medium">{guardian.employer}</p>
              </div>
            )}
            {guardian.workPhone && (
              <div>
                <p className="text-sm text-muted-foreground">Work Phone</p>
                <p className="font-medium">{guardian.workPhone}</p>
              </div>
            )}
            {guardian.workAddress && (
              <div>
                <p className="text-sm text-muted-foreground">Work Address</p>
                <p className="font-medium">{guardian.workAddress}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Access Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Portal Access</span>
              <Badge variant="outline">
                {guardian.canLogin ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Account Status</span>
              <Badge variant="outline" className="bg-green-500/10">
                {guardian.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            {guardian.profile && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Profile Created</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(guardian.profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Children */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Children ({guardian.students.length})
          </CardTitle>
          <CardDescription>
            Students linked to your guardian account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {guardian.students.map((gs) => {
              const student = gs.student;
              const studentInitials =
                `${student.profile.firstName.charAt(0)}${student.profile.lastName.charAt(0)}`.toUpperCase();

              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{studentInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {student.profile.firstName} {student.profile.lastName}
                        </p>
                        {gs.isPrimary && (
                          <Badge variant="secondary" className="text-xs">
                            Primary Guardian
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{student.studentId}</span>
                        {student.class && (
                          <>
                            <span>•</span>
                            <span>{student.class.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex gap-4">
                      {gs.canPickup && <span>✓ Can Pickup</span>}
                      {gs.receiveReports && <span>✓ Reports</span>}
                      {gs.receiveAlerts && <span>✓ Alerts</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-blue-900 mb-2">Need Help?</h4>
          <p className="text-sm text-blue-800">
            If you need to update your information or have any questions, please
            contact the school administration at{" "}
            {school.email || "the school office"}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
