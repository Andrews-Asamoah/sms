// app/(school)/[schoolSlug]/staff/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSchoolRole } from "@/lib/auth/school-access";

interface StaffLayoutProps {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}

export default async function StaffLayout({
  children,
  params,
}: StaffLayoutProps) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/staff`);
  }

  const roleInfo = getSchoolRole(session, schoolSlug);

  // Basic check to ensure they are at least a staff/member
  if (!roleInfo) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  return <>{children}</>;
}
