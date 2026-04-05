import { requireSchoolAccess } from "@/lib/auth/guards";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { StudentAttendanceView } from "@/components/shared/attendance/student-attendance-view";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function GuardianChildAttendancePage({
  params,
}: {
  params: Promise<{ schoolSlug: string; childId: string }>;
}) {
  const { schoolSlug, childId } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const guardian = await prisma.guardian.findFirst({
    where: {
      school: { subdomain: schoolSlug },
      profile: { userId: session.user.id },
    },
  });

  if (!guardian) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Ensure the guardian has access to this specific child
  const student = await prisma.student.findFirst({
    where: {
      id: childId,
      guardians: {
        some: { guardianId: guardian.id },
      },
      school: { subdomain: schoolSlug },
    },
    include: {
      profile: true,
    },
  });

  if (!student) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href={`/${schoolSlug}/guardian/children/${childId}`}>
        <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Child Profile
        </Button>
      </Link>
      
      <StudentAttendanceView
        schoolSlug={schoolSlug}
        studentId={student.id}
        studentName={`${student.profile.firstName} ${student.profile.lastName}`}
      />
    </div>
  );
}
