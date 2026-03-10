// app/(school)/[schoolSlug]/admin/classes/new/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ArrowLeft, GraduationCap } from "lucide-react";
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

interface NewClassPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function NewClassPage({ params }: NewClassPageProps) {
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

  // Fetch school with academic years and teachers
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: {
      id: true,
      organizationId: true, // Include organizationId
      academicYears: {
        orderBy: { startDate: "desc" },
      },
      departments: {
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${schoolSlug}/admin/classes`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Create New Class
              </h1>
              <p className="text-muted-foreground mt-1">
                Add a new class to your school
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-0 bg-card/95 backdrop-blur-xl">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">Class Information</CardTitle>
          <CardDescription>
            Fill in the details to create a new class. Required fields are
            marked with an asterisk (*).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClassForm
            schoolId={school.id}
            schoolSlug={schoolSlug}
            organizationId={school.organizationId} // Pass organizationId
            academicYears={school.academicYears}
            teachers={school.teachers
              .filter((t) => t.profile !== null)
              .map((t) => ({
                id: t.id,
                profile: {
                  firstName: t.profile!.firstName,
                  lastName: t.profile!.lastName,
                },
              }))}
            departments={school.departments}
          />
        </CardContent>
      </Card>
    </div>
  );
}
