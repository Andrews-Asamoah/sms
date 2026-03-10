// app/(school)/[schoolSlug]/student/profile/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getCurrentUserProfile } from "@/app/actions/profile";
import { ProfileForm } from "@/components/forms/profile-form";
import { getSchoolRole } from "@/lib/auth/school-access";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/student/profile`);
  }

  const userData = await getCurrentUserProfile();

  if (!userData) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/student/profile`);
  }

  // Override the global role with the effective school role so the form knows they are a student
  const schoolAccess = getSchoolRole(session, schoolSlug);
  if (schoolAccess) {
    userData.role = schoolAccess.effectiveRole;
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
