// ============================================================
// 5. UNIFIED PROFILE PAGE (SHARED)
// app/(school)/[schoolSlug]/profile/page.tsx
// ============================================================

import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { getCurrentUserProfile } from "@/app/actions/profile";

import { ProfileForm } from "@/components/forms/profile-form";
import { hasSchoolAccess } from "@/lib/auth/school-access";

interface ProfilePageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function SchoolProfilePage({ params }: ProfilePageProps) {
  const { schoolSlug } = await params;
  const session = await getAuthSession();

  if (!session) {
    redirect("/auth/login");
  }

  // Verify user has access to this school
  const hasAccess = await hasSchoolAccess(session.user.id, schoolSlug);
  if (!hasAccess) {
    redirect("/unauthorized");
  }

  const userData = await getCurrentUserProfile();
  if (!userData) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information and preferences
        </p>
      </div>
      <ProfileForm
        userData={userData}
        revalidatePath={`/${schoolSlug}/profile`}
      />
    </div>
  );
}
