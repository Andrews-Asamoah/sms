// app/(system)/schools/[schoolId]/subscription/page.tsx

import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { SchoolSubscriptionManager } from "@/components/System/Schools/school-subscription-manager";

interface SchoolSubscriptionPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function SchoolSubscriptionPage({
  params,
}: SchoolSubscriptionPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const { schoolSlug } = await params;

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      subscription: {
        include: {
          invoices: {
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
          },
        },
      },
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

  // Check permissions - only superAdmin, owners and admins can access
  const isSuperAdmin = session.isSuperAdmin;
  const isOwnerOrAdmin = school.organization.members.some(
    (m) =>
      m.userId === session.user.id &&
      (m.role === "owner" || m.role === "admin"),
  );

  if (!isSuperAdmin && !isOwnerOrAdmin) {
    redirect(`/schools/${schoolSlug}`);
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Subscription & Billing
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage subscription plan and billing for {school.name}
        </p>
      </div>

      <SchoolSubscriptionManager school={JSON.parse(JSON.stringify(school))} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
