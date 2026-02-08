// app/(school)/[schoolSlug]/page.tsx - FIXED
import { redirect } from "next/navigation";

interface SchoolIndexProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function SchoolIndexPage({ params }: SchoolIndexProps) {
  const { schoolSlug } = await params;

  console.log(`[School Index] Redirecting ${schoolSlug} to admin dashboard`);

  // Redirect to admin dashboard by default
  redirect(`/${schoolSlug}/admin/dashboard`);
}
