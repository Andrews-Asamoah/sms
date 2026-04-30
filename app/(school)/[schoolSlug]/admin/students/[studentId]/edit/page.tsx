// app/(school)/[schoolSlug]/admin/students/[studentId]/edit/page.tsx

import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { StudentForm } from "@/components/school/students/student-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// ============================================================================
// TYPES
// ============================================================================

interface EditStudentPageProps {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}

interface SchoolSettings {
  currentAcademicYearId?: string | null;
  [key: string]: unknown;
}

// ============================================================================
// PAGE
// ============================================================================

export default async function EditStudentPage({
  params,
}: EditStudentPageProps) {
  const { schoolSlug, studentId } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId, schoolId: school.id },
    include: {
      profile: {
        include: {
          // We need the BetterAuth userId and current image URL
          user: { select: { id: true, image: true } },
        },
      },
      class: true,
      department: true,
      house: true,
    },
  });

  if (!student) {
    notFound();
  }

  // Filter classes to the current academic year so the dropdown matches what
  // the student would be assigned to in the bulk upload and new student flows.
  const { currentAcademicYearId } =
    (school.settings as unknown as SchoolSettings) ?? {};

  const [rawClasses, rawDepartments, houses] = await Promise.all([
    prisma.class.findMany({
      where: {
        schoolId: school.id,
        isActive: true,
        ...(currentAcademicYearId
          ? { academicYearId: currentAcademicYearId }
          : {}),
      },
      include: { academicYear: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { schoolId: school.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.house.findMany({
      where: { schoolId: school.id, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Serialize Decimal → number so it is safe to pass to Client Components
  const classes = rawClasses;
  const departments = rawDepartments.map((d) => ({
    ...d,
    promotionPassMark:
      d.promotionPassMark !== null ? Number(d.promotionPassMark) : null,
  }));

  // Prepare initial form values. Optional fields use null coalescing to
  // undefined so uncontrolled form inputs stay in an uncontrolled state
  // rather than receiving an explicit null.
  const initialData = {
    firstName: student.profile.firstName,
    lastName: student.profile.lastName,
    otherNames: student.profile.otherNames ?? undefined,
    gender: student.profile.gender,
    dateOfBirth: new Date(student.profile.dateOfBirth)
      .toISOString()
      .split("T")[0],
    nationality: student.profile.nationality ?? undefined,
    phone: student.profile.phone ?? undefined,
    alternatePhone: student.profile.alternatePhone ?? undefined,
    residentialAddress: student.profile.residentialAddress ?? undefined,
    postalAddress: student.profile.postalAddress ?? undefined,
    city: student.profile.city ?? undefined,
    region: student.profile.region ?? undefined,
    country: student.profile.country ?? undefined,
    studentId: student.studentId,
    admissionNumber: student.admissionNumber ?? "",
    admissionDate: new Date(student.admissionDate).toISOString().split("T")[0],
    classId: student.classId ?? undefined,
    departmentId: student.departmentId ?? undefined,
    houseId: student.houseId ?? undefined,
    previousSchool: student.previousSchool ?? undefined,
    previousClass: student.previousClass ?? undefined,
    bloodGroup: student.bloodGroup ?? undefined,
    allergies: student.allergies ?? undefined,
    medicalConditions: student.medicalConditions ?? undefined,
    emergencyContactName: student.profile.emergencyContactName ?? undefined,
    emergencyContactPhone: student.profile.emergencyContactPhone ?? undefined,
    emergencyRelationship: student.profile.emergencyRelationship ?? undefined,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${schoolSlug}/admin/students/${studentId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Student</h1>
          <p className="text-muted-foreground mt-1">
            Update student information for {student.profile.firstName}{" "}
            {student.profile.lastName}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
          <CardDescription>
            Update student details. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentForm
            schoolId={school.id}
            schoolSlug={schoolSlug}
            classes={classes}
            departments={departments}
            houses={houses}
            suggestedStudentId={student.studentId}
            suggestedAdmissionNumber={student.admissionNumber ?? ""}
            initialData={initialData}
            studentProfileId={studentId}
            userId={student.profile.user?.id}
            currentImage={student.profile.user?.image}
          />
        </CardContent>
      </Card>
    </div>
  );
}
