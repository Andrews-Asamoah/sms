// app/(system)/profile/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session"; // ✅ Use getSession
import { getCurrentUserProfile } from "@/app/actions/profile";
import { ProfileForm } from "@/components/forms/profile-form";

export const dynamic = "force-dynamic";

export default async function SuperAdminAccountPage() {
  const session = await getSession();

  if (!session?.isSuperAdmin) {
    redirect("/auth/login");
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
      <ProfileForm userData={userData} />
    </div>
  );
}
