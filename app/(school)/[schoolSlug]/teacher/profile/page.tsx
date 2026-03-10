// app/(school)/[schoolSlug]/teacher/profile/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getCurrentUserProfile } from "@/app/actions/profile";
import { ProfileForm } from "@/components/forms/profile-form";
import { getActiveSchoolRole } from "@/lib/auth/school-access";

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/teacher/profile`);
  }

  // Active role check
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  const effectiveRole = activeRole?.effectiveRole || "teacher";

  if (
    !["teacher", "admin", "owner", "headteacher"].includes(effectiveRole) &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/teacher/unauthorized`);
  }

  const userData = await getCurrentUserProfile();

  if (!userData) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/teacher/profile`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information and preferences
        </p>
      </div>
      <ProfileForm userData={userData} />
    </div>
  );
}
