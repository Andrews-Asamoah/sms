// app/(school)/[schoolSlug]/teacher/medical/page.tsx

import { requireSchoolAccess } from "@/lib/auth/guards";
import { getActiveSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { Heart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TeacherMedicalClient } from "./client";

export const metadata: Metadata = {
  title: "Student Health Records",
  description: "View student medical profiles and emergency contacts",
};

interface TeacherMedicalPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function TeacherMedicalPage({
  params,
}: TeacherMedicalPageProps) {
  const { schoolSlug } = await params;

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

  // 2. Fetch School
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  // 3. Fetch Teacher Profile
  const teacher = await prisma.teacher.findFirst({
    where: {
      schoolId: school.id,
      profile: { userId: session.user.id },
    },
    select: { id: true },
  });

  if (!teacher) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  // 4. Fetch classes where this teacher is the class teacher
  const myClasses = await prisma.class.findMany({
    where: {
      schoolId: school.id,
      classTeacherId: teacher.id,
      isActive: true,
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // If teacher is not a class teacher, show a friendly restriction notice
  if (myClasses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-8 w-8 text-rose-500 fill-rose-500" />
            Student Health
          </h1>
          <p className="text-muted-foreground mt-1">
            View student medical conditions and emergency contact info
          </p>
        </div>

        <Card className="border-dashed border-border/80 backdrop-blur-sm bg-card/40 max-w-2xl mx-auto mt-8">
          <CardHeader className="text-center py-10">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground/45 mb-4 stroke-[1.5]" />
            <CardTitle className="text-xl font-semibold">Access Restricted</CardTitle>
            <CardDescription className="text-sm max-w-md mx-auto mt-2">
              Only class teachers can view student medical records. You are not currently assigned as a class teacher for any active classes.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const classIds = myClasses.map((c) => c.id);

  // 5. Fetch students in the teacher's classes with medical records
  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      status: "ACTIVE",
      classId: { in: classIds },
      OR: [
        { AND: [{ bloodGroup: { not: null } }, { bloodGroup: { not: "" } }] },
        { AND: [{ allergies: { not: null } }, { allergies: { not: "" } }] },
        { AND: [{ medicalConditions: { not: null } }, { medicalConditions: { not: "" } }] },
      ],
    },
    include: {
      profile: {
        include: {
          user: {
            select: {
              image: true,
            },
          },
        },
      },
      class: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      profile: {
        lastName: "asc",
      },
    },
  });

  // Serialize records
  const serializedStudents = students.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    bloodGroup: s.bloodGroup,
    allergies: s.allergies,
    medicalConditions: s.medicalConditions,
    profile: {
      id: s.profile.id,
      firstName: s.profile.firstName,
      lastName: s.profile.lastName,
      otherNames: s.profile.otherNames,
      gender: s.profile.gender,
      emergencyContactName: s.profile.emergencyContactName,
      emergencyContactPhone: s.profile.emergencyContactPhone,
      emergencyRelationship: s.profile.emergencyRelationship,
      user: {
        image: s.profile.user?.image ?? null,
      },
    },
    class: s.class ? { id: s.class.id, name: s.class.name } : null,
  }));

  return (
    <TeacherMedicalClient
      schoolSlug={schoolSlug}
      students={serializedStudents}
      classes={myClasses}
    />
  );
}
