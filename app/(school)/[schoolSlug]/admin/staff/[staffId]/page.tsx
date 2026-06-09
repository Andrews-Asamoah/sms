import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  User,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { BanUserButton } from "@/components/school/ban-user-button";
import { EditStaffDialog } from "@/components/school/staff/edit-staff-dialog";

interface StaffDetailPageProps {
  params: Promise<{ schoolSlug: string; staffId: string }>;
}

export default async function StaffDetailPage({
  params,
}: StaffDetailPageProps) {
  const { schoolSlug, staffId } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      profile: {
        include: {
          user: true,
        },
      },
      department: true,
      school: true,
    },
  });

  const departments = await prisma.department.findMany({
    where: { schoolId: staff?.schoolId || "" },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  if (!staff || staff.school.subdomain !== schoolSlug || !staff.profile) {
    notFound();
  }

  const profile = staff.profile;

  const initials =
    `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/${schoolSlug}/admin/staff`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Staff Details
            </h1>
            <p className="text-muted-foreground text-sm">
              View information for {profile.firstName} {profile.lastName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile.userId && (
            <BanUserButton
              schoolSlug={schoolSlug}
              userId={profile.userId}
              isBanned={profile.user?.banned ?? false}
              userName={`${profile.firstName} ${profile.lastName}`}
            />
          )}
          <EditStaffDialog schoolSlug={schoolSlug} departments={departments} staff={staff as any} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile.user?.image || undefined} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background ${staff.isActive ? "bg-green-500" : "bg-gray-400"}`}
              />
            </div>
            <CardTitle>
              {profile.firstName} {profile.lastName}
            </CardTitle>
            <CardDescription className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="secondary" className="font-mono text-xs">
                {staff.staffId}
              </Badge>
              {staff.staffNumber && (
                <Badge variant="outline" className="font-mono text-xs">
                  {staff.staffNumber}
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    {staff.jobTitle || staff.staffType.replace("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">Role</p>
                </div>
              </div>

              {staff.department && (
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">
                      {staff.department.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Department</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-foreground capitalize">
                    {staff.employmentType.replace("_", " ").toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Employment Type
                  </p>
                </div>
              </div>

              {profile.user?.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="overflow-hidden">
                    <p
                      className="font-medium text-foreground truncate"
                      title={profile.user.email}
                    >
                      {profile.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">Email</p>
                  </div>
                </div>
              )}

              {profile.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">
                      {profile.phone}
                    </p>
                    <p className="text-xs text-muted-foreground">Phone</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    {format(new Date(staff.hireDate), "MMM dd, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">Hired Date</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Column */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Private personal details</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-8 gap-y-6 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Full Name</p>
                <p className="font-medium">
                  {profile.firstName} {profile.otherNames}{" "}
                  {profile.lastName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Date of Birth</p>
                <p className="font-medium">
                  {format(new Date(profile.dateOfBirth), "MMMM dd, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Gender</p>
                <p className="font-medium capitalize">
                  {profile.gender.toLowerCase()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Nationality</p>
                <p className="font-medium">
                  {profile.nationality || "Ghanaian"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">
                  Contract End Date
                </p>
                <p className="font-medium">
                  {staff.contractEndDate
                    ? format(
                        new Date(staff.contractEndDate),
                        "MMM dd, yyyy",
                      )
                    : "Indefinite"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
