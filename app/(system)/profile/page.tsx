// ============================================
// 4. SUPER ADMIN ACCOUNT PAGE
// app/(system)/account/page.tsx
// ============================================

import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { getCurrentUserProfile } from "@/app/actions/profile";
import { ProfileForm } from "@/components/forms/profile-form";

export default async function SuperAdminAccountPage() {
  const session = await getAuthSession();

  if (!session || session.user.role !== "superAdmin") {
    redirect("/login");
  }

  const userData = await getCurrentUserProfile();

  if (!userData) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information and preferences
        </p>
      </div>

      <ProfileForm userData={userData} revalidatePath="/profile" />
    </div>
  );
}
