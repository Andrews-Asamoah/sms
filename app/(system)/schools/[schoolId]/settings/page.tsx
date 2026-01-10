// app/(system)/schools/[schoolId]/settings/page.tsx
import { redirect, notFound } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
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
interface SchoolSettingsPageProps {
  params: Promise<{
    schoolId: string;
  }>;
}

export default async function SchoolSettingsPage({
  params,
}: SchoolSettingsPageProps) {
  const session = await getAuthSession();

  // Only superAdmins can edit schools
  if (!session || session.user.role !== "superAdmin") {
    redirect("/dashboard");
  }

  const { schoolId } = await params;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
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

      <div className="max-w-4xl space-y-6">
        {/* School Information */}
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
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Delete this school</h4>
                <p className="text-sm text-muted-foreground">
                  Once deleted, the school and all its data will be permanently
                  removed.
                  {hasData && (
                    <span className="block text-destructive mt-1">
                      This school has {school._count.students} students,{" "}
                      {school._count.teachers} teachers, and{" "}
                      {school._count.staff} staff members.
                    </span>
                  )}
                </p>
              </div>
              <DeleteSchoolDialog
                schoolId={school.id}
                schoolName={school.name}
                schoolCode={school.code}
                hasData={hasData}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
