// app/(school)/[schoolSlug]/admin/users/page.tsx
// Redirects to the settings page. User management is handled per-category:
//   /admin/students, /admin/teachers, /admin/staff, /admin/guardians
import { redirect } from "next/navigation";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  redirect(`/${schoolSlug}/admin/settings`);
}
