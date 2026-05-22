// app/(school)/[schoolSlug]/admin/attendance/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { AttendanceClient } from "../../teacher/attendance/attendance-client";

export default async function AdminAttendancePage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);
  const schoolRole = getSchoolRole(session, schoolSlug);

  if (
    schoolRole?.effectiveRole !== "admin" &&
    schoolRole?.effectiveRole !== "owner" &&
    schoolRole?.effectiveRole !== "headteacher" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    redirect("/auth/login");
  }

  // Get ALL active classes in the school
  const classes = await prisma.class.findMany({
    where: {
      schoolId: school.id,
      isActive: true,
    },
    include: {
      academicYear: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Attendance
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Mark and review daily student attendance across all classes
            </p>
          </div>
        </div>
        <AttendanceClient
          initialClasses={classes}
          schoolSlug={schoolSlug}
          editableClassIds={[]}
          isAdmin={true}
        />
      </div>
    </div>
  );
}
