// app/(school)/[schoolSlug]/page.tsx - DYNAMIC AND ROLE-AWARE REDIRECT
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSchoolRole, getActiveSchoolRole } from "@/lib/auth/school-access";

interface SchoolIndexProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function SchoolIndexPage({ params }: SchoolIndexProps) {
  const { schoolSlug } = await params;

  // Fetch the active session
  const session = await getSession();
  if (!session) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}`);
  }

  // Get the user's role profile for this school
  const schoolRole = getSchoolRole(session, schoolSlug);
  if (!schoolRole) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Resolve the active school role context (supports multi-role users switching dashboards)
  const activeSchoolRole = await getActiveSchoolRole(session, schoolSlug);
  const currentActiveRole = activeSchoolRole?.effectiveRole ?? schoolRole.effectiveRole;

  switch (currentActiveRole) {
    case "accountant":
      redirect(`/${schoolSlug}/accountant`);
    case "admin":
    case "owner":
    case "headteacher":
      redirect(`/${schoolSlug}/admin`);
    case "teacher":
      redirect(`/${schoolSlug}/teacher`);
    case "student":
      redirect(`/${schoolSlug}/student`);
    case "guardian":
      redirect(`/${schoolSlug}/guardian`);
    default:
      redirect(`/${schoolSlug}/unauthorized`);
  }
}
