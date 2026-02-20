// app/(system)/subscriptions/[schoolSlug]/page.tsx - SuperAdmin individual school subscription
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { Metadata } from "next";
import { SchoolSubscriptionManager } from "@/components/System/Schools/school-subscription-manager";

export const metadata: Metadata = {
  title: "Manage Subscription",
  description: "Manage school subscription",
};

export const dynamic = "force-dynamic";

interface ManageSubscriptionPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function ManageSubscriptionPage({
  params,
}: ManageSubscriptionPageProps) {
  const session = await getSession();
  if (!session?.isSuperAdmin) {
    redirect("/auth/login");
  }

  const { schoolSlug } = await params;

  // Find school by ID or Subdomain to be safe, but link uses subdomain now
  const school = await prisma.school.findFirst({
    where: {
      OR: [{ id: schoolSlug }, { subdomain: schoolSlug }],
    },
    include: {
      subscription: {
        include: {
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      },
      organization: {
        select: { name: true, slug: true },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Manage Subscription — {school.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage subscription plan and billing for this school.
        </p>
      </div>

      <SchoolSubscriptionManager school={school} isSuperAdmin={true} />
    </div>
  );
}
