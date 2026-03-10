// app/(school)/[schoolSlug]/accountant/people/staff/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Users, Briefcase, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffDataTable } from "./staff-table";
import { formatCurrency } from "@/lib/utils";

export default async function AccountantStaffPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (role?.effectiveRole !== "accountant" && !session.isSuperAdmin) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) redirect("/");

  // Fetch Non-Teaching Staff
  const nonTeachingStaff = await prisma.staff.findMany({
    where: { schoolId: school.id },
    include: {
      profile: true,
    },
    orderBy: { profile: { firstName: "asc" } },
  });

  // Fetch Teachers
  const teachers = await prisma.teacher.findMany({
    where: { schoolId: school.id },
    include: {
      profile: true,
    },
    orderBy: { profile: { firstName: "asc" } },
  });

  // Normalize data
  const unifiedStaff = [
    ...nonTeachingStaff.map((s) => ({
      id: s.id,
      firstName: s.profile?.firstName || "N/A",
      lastName: s.profile?.lastName || "N/A",
      role: s.jobTitle || s.staffType.replace("_", " "),
      salary: Number(s.monthlySalary || 0),
      type: "STAFF" as const,
      isActive: s.isActive,
    })),
    ...teachers.map((t) => ({
      id: t.id,
      firstName: t.profile?.firstName || "N/A",
      lastName: t.profile?.lastName || "N/A",
      role: "Teacher",
      salary: Number(t.monthlySalary || 0),
      type: "TEACHER" as const,
      isActive: t.isActive,
    })),
  ].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(
      `${b.firstName} ${b.lastName}`,
    ),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Staff Directory
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage staff members and salaries.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-md border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Staff
            </CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {unifiedStaff.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Payroll
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(
                unifiedStaff.reduce((sum, s) => sum + s.salary, 0),
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Employees
            </CardTitle>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {unifiedStaff.filter((s) => s.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-md border-border/50">
        <CardContent className="pt-6">
          <StaffDataTable data={unifiedStaff} schoolSlug={schoolSlug} />
        </CardContent>
      </Card>
    </div>
  );
}
