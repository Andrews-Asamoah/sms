// app/(school)/[schoolSlug]/teacher/attendance/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole, getActiveSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { AttendanceClient } from "./attendance-client";

export default async function TeacherAttendancePage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  const effectiveRole = activeRole?.effectiveRole || "teacher";

  if (
    !["teacher", "admin", "owner", "headteacher"].includes(effectiveRole) &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    redirect("/auth/login");
  }

  // Define if the user should be restricted to only their assigned classes
  // We restrict if the active role is 'teacher', even if they have higher roles.
  const isRestrictedTeacher = effectiveRole === "teacher";

  // Get classes: filter by teacher if restricted
  const classes = await prisma.class.findMany({
    where: {
      schoolId: school.id,
      isActive: true,
      ...(isRestrictedTeacher && {
        classTeacher: {
          profile: {
            userId: session.user.id,
          },
        },
      }),
    },
    include: {
      academicYear: true,
      classTeacher: {
        select: {
          profile: {
            select: { userId: true },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const editableClassIds = classes.map((c) => c.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Attendance
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Mark daily attendance for your assigned classes
            </p>
          </div>
        </div>
        <AttendanceClient
          initialClasses={classes}
          schoolSlug={schoolSlug}
          editableClassIds={editableClassIds}
          isAdmin={false}
        />
      </div>
    </div>
  );
}
