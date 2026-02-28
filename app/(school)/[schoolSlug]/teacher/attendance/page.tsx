// app/(school)/[schoolSlug]/teacher/attendance/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
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
  const schoolRole = getSchoolRole(session, schoolSlug);

  if (
    !["teacher", "admin", "owner"].includes(schoolRole?.effectiveRole || "") &&
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

  const editableClassIds = classes
    .filter((c) => c.classTeacher?.profile?.userId === session.user.id)
    .map((c) => c.id);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
      </div>
      <AttendanceClient
        initialClasses={classes}
        schoolSlug={schoolSlug}
        editableClassIds={editableClassIds}
        isAdmin={false}
      />
    </div>
  );
}
