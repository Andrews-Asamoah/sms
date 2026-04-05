import { requireSchoolAccess } from "@/lib/auth/guards";
import { getActiveSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { RemarksClient } from "./remarks-client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface RemarksPageProps {
  params: Promise<{
    schoolSlug: string;
    classSlug: string;
  }>;
}

export default async function RemarksPage({ params }: RemarksPageProps) {
  const { schoolSlug, classSlug } = await params;

  // 1. Auth check
  const session = await requireSchoolAccess(schoolSlug);
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  const effectiveRole = activeRole?.effectiveRole || "teacher";

  const isAdmin =
    effectiveRole === "admin" ||
    effectiveRole === "owner" ||
    effectiveRole === "headteacher" ||
    session.isSuperAdmin;

  // 2. Fetch Class Details
  const classData = await prisma.class.findFirst({
    where: {
      OR: [{ slug: classSlug }, { id: classSlug }],
      school: { subdomain: schoolSlug },
    },
    select: {
      id: true,
      name: true,
      classTeacherId: true,
      schoolId: true,
    },
  });

  if (!classData) notFound();

  // 2b. Access check - Only class teacher or admin can enter class-wide remarks
  const teacher = await prisma.teacher.findFirst({
    where: {
      schoolId: classData.schoolId,
      profile: { userId: session.user.id },
    },
    select: { id: true },
  });

  const isClassTeacher = teacher && classData.classTeacherId === teacher.id;

  if (!isAdmin && !isClassTeacher) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  // 3. Fetch Students
  const students = await prisma.student.findMany({
    where: {
      school: { subdomain: schoolSlug },
      status: "ACTIVE",
      OR: [
        { enrollments: { some: { classId: classData.id, status: "ACTIVE" } } },
        { classId: classData.id },
      ],
    },
    select: {
      id: true,
      profile: {
        select: { firstName: true, lastName: true, otherNames: true },
      },
      admissionNumber: true,
    },
    orderBy: { profile: { lastName: "asc" } },
  });

  // 4. Fetch Active Term
  const activeTerm =
    (await prisma.term.findFirst({
      where: {
        academicYear: { school: { id: classData.schoolId } },
      },
      orderBy: { createdAt: "desc" },
    })) ||
    (await prisma.term.findFirst({
      where: { academicYear: { school: { id: classData.schoolId } } },
      orderBy: { createdAt: "desc" },
    }));

  if (!activeTerm) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <h2>
          No active term found for this school. Please contact an administrator.
        </h2>
      </div>
    );
  }

  // Normalize students for client
  const normalizedStudents = students.map((s) => ({
    id: s.id,
    firstName: s.profile.firstName,
    lastName: s.profile.lastName,
    otherNames: s.profile.otherNames,
    admissionNumber: s.admissionNumber,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${schoolSlug}/teacher/classes`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {classData.name} - Report Card Remarks
            </h1>
            <MessageSquareText className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            Enter AI-assisted academic and behavioral remarks for the current
            term ({activeTerm.name}).
          </p>
        </div>
      </div>

      <RemarksClient
        schoolSlug={schoolSlug}
        classId={classData.id}
        termId={activeTerm.id}
        students={normalizedStudents}
      />
    </div>
  );
}
