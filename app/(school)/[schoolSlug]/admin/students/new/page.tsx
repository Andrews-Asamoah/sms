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

// ============================================================================
// TYPES
// ============================================================================

interface NewStudentPageProps {
  params: Promise<{ schoolSlug: string }>;
}

interface SchoolSettings {
  currentAcademicYearId?: string | null;
  [key: string]: unknown;
}

// ============================================================================
// PAGE
// ============================================================================

export default async function NewStudentPage({ params }: NewStudentPageProps) {
  const { schoolSlug } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher" &&
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

  // Filter classes to the current academic year — consistent with bulk upload
  // and edit pages so the admin always sees the same set of classes.
  const { currentAcademicYearId } =
    (school.settings as unknown as SchoolSettings) ?? {};

  const [classes, rawDepartments, houses] = await Promise.all([
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

  // Serialize Decimal fields so they can safely be passed to Client Components.
  const departments = rawDepartments.map((d) => ({
    ...d,
    promotionPassMark:
      d.promotionPassMark !== null ? Number(d.promotionPassMark) : null,
  }));

  // Generate suggested IDs to pre-fill the form.
  //
  // NOTE: These are suggestions only — the API route runs its own
  // collision-resolving generateStudentIdentifiers() on submission, so there
  // is no risk of a duplicate even if two admins open this page simultaneously.
  // The suggestions here are purely UX (the admin can see what the ID will
  // look like before saving).
  const currentYear = new Date().getFullYear();
  const yy = currentYear.toString().slice(-2);
  const schoolPrefix = schoolSlug.toUpperCase();
  const stuPrefix = `${schoolPrefix}-${yy}-`;
  const admPrefix = yy;

  const [lastStudentByYear, lastAdmissionByYear] = await Promise.all([
    prisma.student.findFirst({
      where: {
        schoolId: school.id,
        studentId: { startsWith: stuPrefix },
      },
      orderBy: { createdAt: "desc" },
      select: { studentId: true },
    }),
    prisma.student.findFirst({
      where: {
        schoolId: school.id,
        admissionNumber: { startsWith: admPrefix },
      },
      orderBy: { createdAt: "desc" },
      select: { admissionNumber: true },
    }),
  ]);

  let nextStudentSeq = 1;
  if (lastStudentByYear?.studentId) {
    const n = parseInt(lastStudentByYear.studentId.slice(stuPrefix.length));
    if (!isNaN(n)) nextStudentSeq = n + 1;
  }

  let nextAdmissionSeq = 1;
  if (lastAdmissionByYear?.admissionNumber) {
    const n = parseInt(lastAdmissionByYear.admissionNumber.slice(admPrefix.length));
    if (!isNaN(n)) nextAdmissionSeq = n + 1;
  }

  const suggestedStudentId = `${stuPrefix}${nextStudentSeq
    .toString()
    .padStart(4, "0")}`;
  const suggestedAdmissionNumber = `${admPrefix}${nextAdmissionSeq
    .toString()
    .padStart(4, "0")}`;

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
