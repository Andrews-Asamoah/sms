// app/(school)/[schoolSlug]/guardian/profile/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getCurrentUserProfile } from "@/app/actions/profile";
import { ProfileForm } from "@/components/forms/profile-form";

interface GuardianProfilePageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function GuardianProfilePage({
  params,
}: GuardianProfilePageProps) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/guardian/profile`);
  }

  const userData = await getCurrentUserProfile();

  if (!userData) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/guardian/profile`);
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
