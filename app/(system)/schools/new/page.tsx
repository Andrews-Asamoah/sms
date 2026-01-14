import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateSchoolForm } from "@/components/forms/create-school-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, School } from "lucide-react";

export const metadata = {
  title: "Create New School | School Management System",
  description: "Set up a new school organization with its configuration",
};

export default async function NewSchoolPage() {
  const session = await getAuthSession();

  // Only superAdmins can create schools
  if (!session || session.user.role !== "superAdmin") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <School className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Create New School
            </h1>
            <p className="text-muted-foreground mt-1">
              Set up a new school organization with its configuration
            </p>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <div className="max-w-4xl mb-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>What happens when you create a school?</AlertTitle>
          <AlertDescription className="mt-2 space-y-1 text-sm">
            <ul className="list-disc list-inside space-y-1">
              <li>
                A new organization is created in Better Auth with you as the
                owner
              </li>
              <li>
                A school record is linked to the organization with unique code
                and subdomain
              </li>
              <li>
                A FREE subscription plan is automatically assigned (50 students,
                10 teachers, 5 staff)
              </li>
              <li>
                You can then add administrators and other members to manage the
                school
              </li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>

      {/* Form Card */}
      <div className="max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>School Information</CardTitle>
            <CardDescription>
              Fill in the details below to create a new school organization.
              Required fields are marked with an asterisk (*).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateSchoolForm />
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <div className="max-w-4xl mt-6">
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Create the school by filling out the form above</li>
              <li>Set up academic years and terms for the school calendar</li>
              <li>Create departments and classes for organizing students</li>
              <li>Add teachers and staff members to the school</li>
              <li>Enroll students and assign them to appropriate classes</li>
              <li>Configure grading systems and assessment templates</li>
              <li>Set up fee structures and billing for student payments</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
