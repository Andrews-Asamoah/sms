// app/(school)/[schoolSlug]/layout.tsx - BASE LAYOUT (MINIMAL)
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { ReactNode } from "react";

interface SchoolLayoutProps {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}

export const dynamic = "force-dynamic";

export default async function SchoolLayout({
  children,
  params,
}: SchoolLayoutProps) {
  const { schoolSlug } = await params;

  // Get session
  const session = await getSession();

  if (!session) {
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/admin/dashboard`);
  }

  // Check school access
  const hasAccess = hasSchoolAccess(session, schoolSlug);

  if (!hasAccess) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Verify school exists
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    notFound();
  }

  return <>{children}</>;
}
