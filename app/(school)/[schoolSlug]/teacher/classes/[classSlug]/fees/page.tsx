import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole, getActiveSchoolRole } from "@/lib/auth/school-access";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColumnDef } from "@tanstack/react-table";
import { ClassFeesTable } from "./class-fees-table";

interface ClassFeesPageProps {
  params: Promise<{
    schoolSlug: string;
    classSlug: string;
  }>;
}

export default async function ClassFeesPage({ params }: ClassFeesPageProps) {
  const { schoolSlug, classSlug } = await params;

  // 1. Auth check
  const session = await requireSchoolAccess(schoolSlug);
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  const effectiveRole = activeRole?.effectiveRole || "teacher";

  if (
    !["teacher", "admin", "owner", "headteacher"].includes(effectiveRole)
  ) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  // 2. Fetch teacher identity
  const teacher = await prisma.teacher.findFirst({
    where: {
      school: { subdomain: schoolSlug },
      profile: { userId: session.user.id },
    },
  });
  let teacherId = teacher?.id;

  // If role is specifically teacher, ensure we found a record
  if (effectiveRole === "teacher" && !teacherId) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  // 3. Find Class and verify Teacher is the Class Teacher
  const classData = await prisma.class.findFirst({
    where: {
      school: { subdomain: schoolSlug },
      OR: [{ slug: classSlug }, { id: classSlug }],
    },
    include: {
      students: {
        include: {
          profile: true,
        },
        orderBy: { profile: { firstName: "asc" } },
      },
    },
  });

  if (!classData) return notFound();

  // If role is teacher, ensure they are the class teacher. Admins/owners bypass this check IF they are not in Teacher role.
  if (
    effectiveRole === "teacher" &&
    classData.classTeacherId !== teacherId
  ) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  // 4. Summarize Balances
  const studentFinances = classData.students.map((student) => ({
    id: student.id,
    firstName: student.profile.firstName,
    lastName: student.profile.lastName,
    studentId: student.studentId, // ID code
    outstandingBalance: Number(student.outstandingBalance),
  }));

  const totalOutstanding = studentFinances.reduce(
    (sum, student) => sum + student.outstandingBalance,
    0,
  );

  return (
    <div className="container py-6 space-y-6">
      <DashboardPageHeader
        title={`${classData.name} - Fees Status`}
        description="View outstanding balances and payment status for students in your class."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Unpaid Fees
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              GHS{" "}
              {totalOutstanding.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Class total outstanding balance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Students in Default
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentFinances.filter((s) => s.outstandingBalance > 0).length} /{" "}
              {studentFinances.length}
            </div>
            <p className="text-xs text-muted-foreground">Students owing fees</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-background rounded-md border shadow-sm p-4">
        <ClassFeesTable data={studentFinances} />
      </div>
    </div>
  );
}
