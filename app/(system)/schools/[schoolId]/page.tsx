// app/(system)/schools/[schoolSlug]/page.tsx
import { redirect, notFound } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface SchoolDetailPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function SchoolDetailPage({
  params,
}: SchoolDetailPageProps) {
  const session = await getAuthSession();
  if (!session) {
    redirect("/auth/login");
  }

  const { schoolSlug } = await params;

  const school = await prisma.school.findUnique({
    where: { id: schoolSlug },
    include: {
      subscription: true,
    },
  });

  if (!school) {
    notFound();
  }

  // Check if subscription is active
  if (
    school.subscription?.status !== "ACTIVE" &&
    school.subscription?.status !== "TRIALING"
  ) {
    redirect(`/schools/${schoolSlug}/subscription-required`);
  }

  redirect(`/schools/${schoolSlug}/overview`);
}
