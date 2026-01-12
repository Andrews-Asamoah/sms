// app/(system)/schools/[schoolId]/page.tsx
import { redirect, notFound } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface SchoolDetailPageProps {
  params: Promise<{
    schoolId: string;
  }>;
}

export default async function SchoolDetailPage({
  params,
}: SchoolDetailPageProps) {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login");
  }

  const { schoolId } = await params;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
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
    redirect(`/schools/${schoolId}/subscription-required`);
  }

  redirect(`/schools/${schoolId}/overview`);
}
