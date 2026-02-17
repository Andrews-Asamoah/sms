// app/(school)/[schoolSlug]/admin/profile/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getCurrentUserProfile } from "@/app/actions/profile";
import { ProfileForm } from "@/components/forms/profile-form";

export default async function AdminProfilePage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/admin/profile`);
  }

  const userData = await getCurrentUserProfile();

  if (!userData) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/admin/profile`);
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
