// app/(system)/schools/[schoolId]/settings/page.tsx

import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditSchoolForm } from "@/components/forms/edit-school-form";
import { DeleteSchoolDialog } from "@/components/System/Schools/delete-school-dialog";
import { SchoolLogoEditor } from "@/components/settings/school-logo-editor";

interface SchoolSettingsPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function SchoolSettingsPage({
  params,
}: SchoolSettingsPageProps) {
  // Only superAdmins can edit schools
  await requireSuperAdmin();

  const { schoolSlug } = await params;

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      subscription: true,
      organization: true,
      _count: {
        select: {
          students: true,
          teachers: true,
          staff: true,
        },
      },
    },
  });

  if (!school) {
    notFound();
  }

  const hasData =
    school._count.students > 0 ||
    school._count.teachers > 0 ||
    school._count.staff > 0;

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">School Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage settings and configuration for {school.name}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 items-start max-w-5xl">
        {/* Left Column: Logo & Quick Stats */}
        <div className="md:col-span-1 space-y-6">
          <SchoolLogoEditor 
            schoolId={school.id}
            currentLogo={school.logo}
            schoolName={school.name}
          />
        </div>

        {/* Right Column: Main Settings */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>
                Update the school&apos;s basic information and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditSchoolForm school={school} />
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-medium">Delete this school</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Once deleted, the school and all its data will be permanently removed.
                    {hasData && (
                      <span className="block text-destructive mt-2">
                        This school has {school._count.students} students,{" "}
                        {school._count.teachers} teachers, and{" "}
                        {school._count.staff} staff members.
                      </span>
                    )}
                  </p>
                </div>
                <DeleteSchoolDialog
                  schoolSlug={school.subdomain}
                  schoolName={school.name}
                  schoolCode={school.code}
                  hasData={hasData}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
