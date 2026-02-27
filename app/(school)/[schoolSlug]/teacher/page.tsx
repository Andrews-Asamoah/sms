import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import { AnnouncementWidget } from "@/components/dashboard/announcement-widget";

export default async function TeacherDashboard({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);
  const schoolRole = getSchoolRole(session, schoolSlug);

  if (
    schoolRole?.effectiveRole !== "teacher" &&
    schoolRole?.effectiveRole !== "admin" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Teacher Dashboard
        </h1>
        <p className="text-muted-foreground italic">
          Welcome back, {session.user.name}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AnnouncementWidget />
        </div>
        <div className="space-y-6">{/* Future quick actions widget */}</div>
      </div>
    </div>
  );
}
