// app/(school)/[schoolSlug]/admin/students/new/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
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

interface NewStudentPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function NewStudentPage({ params }: NewStudentPageProps) {
  const { schoolSlug } = await params;

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

  // Fetch school and related data
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
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

  // Generate next student ID and Admission Number
  const currentYear = new Date().getFullYear();
  const yearShort = currentYear.toString().slice(-2);

  const schoolPrefix = schoolSlug.toUpperCase();

  // Suggested Student ID: STU-YYYY-NNNN
  const lastStudent = await prisma.student.findFirst({
    where: { 
      schoolId: school.id,
      studentId: { startsWith: `STU-${currentYear}-` }
    },
    orderBy: { createdAt: "desc" },
    select: { studentId: true },
  });

  let nextStudentNumber = 1;
  if (lastStudent?.studentId.startsWith(`STU-${currentYear}-`)) {
    const parts = lastStudent.studentId.split("-");
    nextStudentNumber = parseInt(parts[parts.length - 1]) + 1;
  }

  const suggestedStudentId = `STU-${currentYear}-${nextStudentNumber.toString().padStart(4, "0")}`;

  // Suggested Admission Number: {SCHOOL_PREFIX}-YY-NNNN
  const lastAdmission = await prisma.student.findFirst({
    where: {
      schoolId: school.id,
      admissionNumber: { startsWith: `${schoolPrefix}-${yearShort}-` },
    },
    orderBy: { createdAt: "desc" },
    select: { admissionNumber: true },
  });

  let nextAdmissionNumber = 1;
  if (lastAdmission?.admissionNumber?.startsWith(`${schoolPrefix}-${yearShort}-`)) {
    const parts = lastAdmission.admissionNumber.split("-");
    nextAdmissionNumber = parseInt(parts[parts.length - 1]) + 1;
  }

  const suggestedAdmissionNumber = `${schoolPrefix}-${yearShort}-${nextAdmissionNumber.toString().padStart(4, "0")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${schoolSlug}/admin/students`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Student</h1>
          <p className="text-muted-foreground mt-1">
            Enter student details to create a new student record
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
          <CardDescription>
            Fill in all required fields. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentForm
            schoolId={school.id}
            schoolSlug={schoolSlug}
            classes={classes}
            departments={departments}
            houses={houses}
            suggestedStudentId={suggestedStudentId}
            suggestedAdmissionNumber={suggestedAdmissionNumber}
          />
        </CardContent>
      </Card>
    </div>
  );
}
