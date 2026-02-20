// app/(school)/[subdomain]/teacher/dashboard/page.tsx

import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";

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
    <div>
      <h1>Teacher Dashboard</h1>
      <p>Welcome, {session.user.name}</p>
    </div>
  );
}
