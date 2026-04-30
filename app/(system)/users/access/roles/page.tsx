import { requireSuperAdmin } from "@/lib/auth/session";
import {
  getOrganizationsForRoleManagement,
  getRolesForOrganization,
} from "./actions";
import { RolesDashboard } from "./roles-dashboard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Roles & Permissions | SuperAdmin Dashboard",
  description:
    "Create and manage custom roles with granular permissions for each school.",
};

export const dynamic = "force-dynamic";

export default async function RolesPermissionsPage() {
  await requireSuperAdmin();

  // Fetch all organizations
  const { data: organizations, error: orgsError } =
    await getOrganizationsForRoleManagement();

  if (orgsError || !organizations || organizations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Roles & Permissions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage system roles and create custom roles per school.
          </p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {orgsError ??
              "No schools found. Create a school first before managing roles."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Load roles for the first org by default
  const firstOrgId = organizations[0].id;
  const { data: initialRoles } = await getRolesForOrganization(firstOrgId);

  return (
    <RolesDashboard
      organizations={organizations}
      initialOrgId={firstOrgId}
      initialRoles={initialRoles ?? []}
    />
  );
}
