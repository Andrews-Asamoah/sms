import { requireSchoolAccess } from "@/lib/auth/guards";
import prisma from "@/lib/prisma";
import { TeacherStudentsTable } from "@/components/school/teacher/students-table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSchoolRole, getActiveSchoolRole } from "@/lib/auth/school-access";

interface StudentsPageProps {
  params: Promise<{
    schoolSlug: string;
    classSlug: string;
  }>;
}

export default async function StudentsPage({ params }: StudentsPageProps) {
  const { schoolSlug, classSlug } = await params;

  // 1. Auth check
  const session = await requireSchoolAccess(schoolSlug);
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  const effectiveRole = activeRole?.effectiveRole || "teacher";

  if (
    !["teacher", "admin", "owner", "headteacher"].includes(effectiveRole) &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  // 2. Fetch Class Details
  const classData = await prisma.class.findFirst({
    where: {
      OR: [{ slug: classSlug }, { id: classSlug }],
      school: { subdomain: schoolSlug },
    },
    select: {
      id: true,
      name: true,
      level: true,
      classTeacherId: true,
      schoolId: true,
    },
  });

  if (!classData) {
    notFound();
  }

  // 2b. Access check (Class Teacher OR Admin)
  const teacher = await prisma.teacher.findFirst({
    where: {
      schoolId: classData.schoolId,
      profile: { userId: session.user.id }
    },
    select: { id: true }
  });

  const isClassTeacher = teacher && classData.classTeacherId === teacher.id;
  const isAdmin = 
    effectiveRole === "admin" || 
    effectiveRole === "owner" || 
    effectiveRole === "headteacher" ||
    session.isSuperAdmin;

  if (!isAdmin && !isClassTeacher) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  // 3. Fetch Students in this class
  const students = await prisma.student.findMany({
    where: {
      school: { subdomain: schoolSlug },
      status: "ACTIVE",
      OR: [
        { enrollments: { some: { classId: classData.id, status: "ACTIVE" } } },
        { classId: classData.id },
      ],
    },
    include: {
      profile: {
        select: {
          firstName: true,
          lastName: true,
          otherNames: true,
          gender: true,
          user: {
            select: {
              email: true,
              image: true,
            },
          },
        },
      },
      guardians: {
        include: {
          guardian: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              relationshipType: true,
            },
          },
        },
      },
    },
    orderBy: {
      profile: {
        lastName: "asc",
      },
    },
  });

  // 4. Normalize data for client
  const normalizedStudents = students.map((s) => ({
    id: s.id,
    firstName: s.profile.firstName,
    lastName: s.profile.lastName,
    otherNames: s.profile.otherNames,
    admissionNumber: s.admissionNumber,
    image: s.profile.user.image,
    email: s.profile.user.email,
    gender: String(s.profile.gender),
    guardians: s.guardians.map((gs) => ({
      name: `${gs.guardian.firstName} ${gs.guardian.lastName}`,
      relationship: gs.guardian.relationshipType,
      phone: gs.guardian.phone,
      email: gs.guardian.email,
    })),
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
              {classData.name} - Students
            </h1>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            Viewing {normalizedStudents.length} active students in{" "}
            {classData.name}
          </p>
        </div>
      </div>

      <TeacherStudentsTable data={normalizedStudents} />
    </div>
  );
}
