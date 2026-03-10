// app/(system)/users/access/page.tsx
import { requireSuperAdmin } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Key, FileCheck, Users } from "lucide-react";

export const metadata = {
  title: "Access Control | SuperAdmin Dashboard",
  description: "Manage system-wide access policies and roles",
};

export default async function AccessControlPage() {
  await requireSuperAdmin();

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Access Control</h1>
        <p className="text-muted-foreground mt-2">
          Manage system-wide access policies, roles, and permissions.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Roles & Permissions */}
        <Card className="hover:shadow-lg transition-all group">
          <CardHeader>
            <div className="p-3 bg-primary/10 w-fit rounded-lg mb-4 group-hover:bg-primary/20 transition-colors">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Global Roles</CardTitle>
            <CardDescription>
              Define and manage system-level administrative roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4" /> 2 Admin Roles Configured
              </li>
              <li className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> 45 Global Permissions
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* API Access */}
        <Card className="hover:shadow-lg transition-all group">
          <CardHeader>
            <div className="p-3 bg-blue-500/10 w-fit rounded-lg mb-4 group-hover:bg-blue-500/20 transition-colors">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>API Access Config</CardTitle>
            <CardDescription>
              Manage API keys and developer access configurations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Feature coming soon. Will allow external integrations to
              authenticate securely.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
