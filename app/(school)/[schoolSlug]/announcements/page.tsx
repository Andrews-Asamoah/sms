import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPrimarySchool } from "@/lib/auth/school-access";

export default async function AnnouncementsRedirectPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const school = getPrimarySchool(session);
  const role = school?.effectiveRole || "member";

  // Redirect to their specific dashboard route
  redirect(`/${schoolSlug}/${role}/announcements`);
}
