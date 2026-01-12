// app/(system)/schools/[schoolId]/subscription/page.tsx
import { redirect, notFound } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SchoolSubscription } from "@/components/System/Schools/school-subscription";

interface SchoolSubscriptionPageProps {
  params: Promise<{
    schoolId: string;
  }>;
}

export default async function SchoolSubscriptionPage({
  params,
}: SchoolSubscriptionPageProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  const { schoolId } = await params;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      subscription: true,
      organization: {
        include: {
          members: true,
        },
      },
      _count: {
        select: {
          students: true,
          teachers: true,
          staff: true,
        },
      },
    },
  });

  if (!school) {
    notFound();
  }

  // Check permissions - only owners and admins can access subscription
  const isSuperAdmin = session.user.role === "superAdmin";
  const isOwnerOrAdmin = school.organization.members.some(
    (m) =>
      m.userId === session.user.id && (m.role === "OWNER" || m.role === "ADMIN")
  );

  if (!isSuperAdmin && !isOwnerOrAdmin) {
    redirect(`/schools/${schoolId}`);
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Subscription & Billing
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your school&apos;s subscription plan and billing information
        </p>
      </div>

      <SchoolSubscription school={school} />
    </div>
  );
}
