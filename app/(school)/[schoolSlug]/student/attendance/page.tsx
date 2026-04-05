import { requireSchoolAccess } from "@/lib/auth/guards";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StudentAttendanceView } from "@/components/shared/attendance/student-attendance-view";

export default async function StudentAttendancePage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const student = await prisma.student.findFirst({
    where: {
      school: { subdomain: schoolSlug },
      profile: { userId: session.user.id },
    },
    include: {
      profile: true,
    },
  });

  if (!student) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  return (
    <StudentAttendanceView
      schoolSlug={schoolSlug}
      studentId={student.id}
      studentName={`${student.profile.firstName} ${student.profile.lastName}`}
    />
  );
}
