// app/(school)/[schoolSlug]/admin/dashboard/page.tsx - FIXED VERSION
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";

interface AdminDashboardProps {
  params: Promise<{ schoolSlug: string }>; // ✅ Fixed param name
}

export default async function AdminDashboard({ params }: AdminDashboardProps) {
  // ✅ Await params
  const { schoolSlug } = await params;

  console.log(`[Admin Dashboard] 🏫 School: ${schoolSlug}`);

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  console.log(`[Admin Dashboard] 👤 User: ${session.user.email}`);
  console.log(`[Admin Dashboard] 👔 Effective Role: ${role?.effectiveRole}`);
  console.log(`[Admin Dashboard] 👑 Is Super Admin: ${session.isSuperAdmin}`);

  // Check authorization
  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    console.log(`[Admin Dashboard] ❌ Insufficient permissions`);
    redirect(`/${schoolSlug}/unauthorized`);
  }

  console.log(`[Admin Dashboard] ✅ Access granted`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Your Role</h3>
          <p className="text-2xl font-bold capitalize">
            {role?.effectiveRole || "N/A"}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Organization Role</h3>
          <p className="text-2xl font-bold capitalize">
            {role?.organizationRole || "None"}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Profile Roles</h3>
          <p className="text-sm">{role?.profileRoles.join(", ") || "None"}</p>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">School</h3>
          <p className="text-sm truncate">{schoolSlug}</p>
        </div>
      </div>

      {session.isSuperAdmin && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
          <p className="text-sm font-medium">
            ⚡ You are viewing this school as a Super Administrator
          </p>
        </div>
      )}
    </div>
  );
}
