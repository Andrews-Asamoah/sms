// app/(school)/[schoolSlug]/staff/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function StaffDashboardPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/staff`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {session.user.name}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder for staff dashboard content */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="font-semibold">Quick Actions</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Staff specific actions will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
