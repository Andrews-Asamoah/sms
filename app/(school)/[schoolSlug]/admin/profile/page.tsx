// ============================================
// 5. SCHOOL ADMIN ACCOUNT PAGE (REUSABLE)
// app/(school)/[schoolSlug]/admin/account/page.tsx
// ============================================

import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { getCurrentUserProfile } from "@/app/actions/profile";
import { ProfileForm } from "@/components/forms/profile-form";

export default async function SchoolAdminAccountPage({
  params,
}: {
  params: { schoolSlug: string };
}) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  const userData = await getCurrentUserProfile();

  if (!userData) {
    redirect("/login");
  }

  const { schoolSlug } = params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information and preferences
        </p>
      </div>

      <ProfileForm
        userData={userData}
        revalidatePath={`/${schoolSlug}/admin/account`}
      />
    </div>
  );
}
