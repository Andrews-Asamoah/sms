// app/(school)/[schoolSlug]/admin/classes/[classId]/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClassForm } from "@/components/forms/class-form";

interface EditClassPageProps {
  params: Promise<{ schoolSlug: string; classId: string }>;
}

export default async function EditClassPage({ params }: EditClassPageProps) {
  const { schoolSlug, classId } = await params;

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

  // Fetch school with academic years and teachers
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      academicYears: {
        orderBy: { startDate: "desc" },
      },
      teachers: {
        where: { isActive: true },
        include: {
          profile: true,
        },
        orderBy: {
          profile: {
            firstName: "asc",
          },
        },
      },
    },
  });

  if (!school) {
    redirect("/");
  }

  // Fetch the class to edit
  const classData = await prisma.class.findUnique({
    where: {
      id: classId,
      schoolId: school.id,
    },
  });

  if (!classData) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${schoolSlug}/admin/classes`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Class</h1>
          <p className="text-muted-foreground mt-1">Update class information</p>
        </div>
      </div>

      {/* Form Card with Glassmorphism */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Class Information</CardTitle>
          <CardDescription>
            Update the details for {classData.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClassForm
            schoolId={school.id}
            schoolSlug={schoolSlug}
            academicYears={school.academicYears}
            teachers={school.teachers}
            initialData={classData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
