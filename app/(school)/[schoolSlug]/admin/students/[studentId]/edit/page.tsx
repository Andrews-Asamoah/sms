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

interface EditStudentPageProps {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}

export default async function EditStudentPage({
  params,
}: EditStudentPageProps) {
  const { schoolSlug, studentId } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  // Check authorization
  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Fetch school
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  // Fetch student with profile
  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
      schoolId: school.id,
    },
    include: {
      profile: true,
      class: true,
      department: true,
      house: true,
    },
  });

  if (!student) {
    notFound();
  }

  // Fetch form options
  const [classes, departments, houses] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: school.id, isActive: true },
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

  // Prepare initial data
  const initialData = {
    // Personal Information
    firstName: student.profile.firstName,
    lastName: student.profile.lastName,
    otherNames: student.profile.otherNames,
    gender: student.profile.gender,
    dateOfBirth: new Date(student.profile.dateOfBirth)
      .toISOString()
      .split("T")[0],
    nationality: student.profile.nationality,

    // Contact
    phone: student.profile.phone,
    alternatePhone: student.profile.alternatePhone,

    // Address
    residentialAddress: student.profile.residentialAddress,
    postalAddress: student.profile.postalAddress,
    city: student.profile.city,
    region: student.profile.region,
    country: student.profile.country,

    // Student Specific
    studentId: student.studentId,
    admissionNumber: student.admissionNumber || "",
    admissionDate: new Date(student.admissionDate).toISOString().split("T")[0],
    classId: student.classId,
    departmentId: student.departmentId,
    houseId: student.houseId,

    // Previous School
    previousSchool: student.previousSchool,
    previousClass: student.previousClass,

    // Medical
    bloodGroup: student.bloodGroup,
    allergies: student.allergies,
    medicalConditions: student.medicalConditions,

    // Emergency
    emergencyContactName: student.profile.emergencyContactName,
    emergencyContactPhone: student.profile.emergencyContactPhone,
    emergencyRelationship: student.profile.emergencyRelationship,
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
            suggestedAdmissionNumber={student.admissionNumber || ""}
            initialData={initialData}
            studentProfileId={studentId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
