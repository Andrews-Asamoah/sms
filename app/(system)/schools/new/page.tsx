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

export default async function NewSchoolPage() {
  const session = await getAuthSession();

  // Only superAdmins can create schools
  if (!session || session.user.role !== "superAdmin") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New School</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new school organization with its configuration
        </p>
      </div>

      <div className="max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>School Information</CardTitle>
            <CardDescription>
              Fill in the details below to create a new school organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateSchoolForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
