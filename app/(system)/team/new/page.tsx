import { requireSuperAdmin } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield } from "lucide-react";
import { CompanySignupForm } from "@/components/System/company-signup-form";

export const metadata = {
  title: "Add Team Member | SuperAdmin Dashboard",
  description: "Invite a new user to your company management team",
};

export default async function CompanySignupPage() {
  await requireSuperAdmin();

  return (
    <div className="container mx-auto py-10 max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Team Member</h1>
        <p className="text-muted-foreground mt-2">
          Create a new SuperAdmin account to help manage the platform. This is
          restricted to platform administrators only.
        </p>
      </div>

      <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Super Admin Privilege</p>
              <p className="text-sm text-muted-foreground mt-1">
                Users created here will have full SuperAdmin access to the
                platform, including all schools and system settings. Only use
                this to onboard trusted platform team members.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New Team Member Details</CardTitle>
          <CardDescription>
            Fill in the details below. The new team member will receive a
            welcome email with their login credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanySignupForm />
        </CardContent>
      </Card>
    </div>
  );
}
