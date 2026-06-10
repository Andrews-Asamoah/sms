// app/(school)/[schoolSlug]/admin/reports/medical/page.tsx

import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { MedicalRecordsClient } from "./client";

export const metadata: Metadata = {
  title: "Student Medical Reports",
  description: "View and manage student medical profiles and emergency contacts",
};

interface MedicalRecordsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function MedicalRecordsPage({
  params,
}: MedicalRecordsPageProps) {
  const { schoolSlug } = await params;

  // 1. Authenticate and authorize
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    role?.effectiveRole !== "headteacher" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // 2. Fetch School
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  // 3. Fetch Classes for filter
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // 4. Fetch Students with medical records
  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      status: "ACTIVE",
      OR: [
        { AND: [{ bloodGroup: { not: null } }, { bloodGroup: { not: "" } }] },
        { AND: [{ allergies: { not: null } }, { allergies: { not: "" } }] },
        { AND: [{ medicalConditions: { not: null } }, { medicalConditions: { not: "" } }] },
      ],
    },
    include: {
      profile: true,
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
    admissionNumber: s.admissionNumber,
    bloodGroup: s.bloodGroup,
    allergies: s.allergies,
    medicalConditions: s.medicalConditions,
    profile: {
      id: s.profile.id,
      firstName: s.profile.firstName,
      lastName: s.profile.lastName,
      otherNames: s.profile.otherNames,
      gender: s.profile.gender,
      phone: s.profile.phone,
      emergencyContactName: s.profile.emergencyContactName,
      emergencyContactPhone: s.profile.emergencyContactPhone,
      emergencyRelationship: s.profile.emergencyRelationship,
    },
    class: s.class ? { id: s.class.id, name: s.class.name } : null,
  }));

  return (
    <MedicalRecordsClient
      schoolSlug={schoolSlug}
      students={serializedStudents}
      classes={classes}
    />
  );
}
