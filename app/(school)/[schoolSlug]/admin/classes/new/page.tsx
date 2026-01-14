// app/(school)/[schoolSlug]/admin/classes/new/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
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

interface NewClassPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function NewClassPage(props: NewClassPageProps) {
  const params = await props.params;
  const { schoolSlug } = params;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="space-y-6 p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/${schoolSlug}/admin/classes`}>
            <Button
              variant="outline"
              size="icon"
              className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Create New Class
            </h1>
            <p className="text-muted-foreground mt-1">
              Add a new class to your school
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl">
          <CardHeader>
            <CardTitle>Class Information</CardTitle>
            <CardDescription>
              Fill in the details to create a new class
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClassForm
              schoolId={school.id}
              schoolSlug={schoolSlug}
              academicYears={school.academicYears}
              teachers={school.teachers}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
