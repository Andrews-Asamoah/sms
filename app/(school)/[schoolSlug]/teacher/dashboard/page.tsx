// app/(school)/[subdomain]/teacher/dashboard/page.tsx

import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";

export default async function TeacherDashboard({
  params,
}: {
  params: { subdomain: string };
}) {
  const session = await requireSchoolAccess(params.subdomain);
  const role = getSchoolRole(session, params.subdomain);

  if (
    role?.role !== "teacher" &&
    role?.role !== "admin" &&
    !session.isSuperAdmin
  ) {
    redirect("/unauthorized");
  }

  return (
    <div>
      <h1>Teacher Dashboard</h1>
      <p>Welcome, {session.user.name}</p>
    </div>
  );
}
