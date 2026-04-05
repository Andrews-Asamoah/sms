// app/(school)/[schoolSlug]/admin/subscription/page.tsx

import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { SchoolSubscription } from "@/components/System/Schools/school-subscription";

export const metadata: Metadata = {
  title: "Subscription & Billing",
  description: "Manage your school subscription and billing",
};

export const dynamic = "force-dynamic";

interface SubscriptionPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function SubscriptionPage({
  params,
}: SubscriptionPageProps) {
  const { schoolSlug } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Always resolve by subdomain — the page URL param is always the slug.
  // Using findUnique (not findFirst with OR) so Prisma uses the unique index.
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      subscription: {
        include: {
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      },
      organization: {
        include: {
          members: {
            where: { userId: session.user.id },
            select: { role: true },
          },
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
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Serialize Decimal fields explicitly before passing to the client component.
  // JSON.parse(JSON.stringify()) is avoided — it silently drops type safety and
  // can produce unexpected results with Date objects.
  const serializedSchool = {
    ...school,
    subscription: school.subscription
      ? {
          ...school.subscription,
          amount:
            school.subscription.amount != null
              ? Number(school.subscription.amount)
              : null,
          invoices: school.subscription.invoices.map((inv) => ({
            ...inv,
            amount: Number(inv.amount),
          })),
        }
      : null,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Subscription & Billing
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your school&apos;s subscription plan and payment details.
        </p>
      </div>
      <SchoolSubscription
        school={serializedSchool as any}
        isSuperAdmin={session.isSuperAdmin}
      />
    </div>
  );
}
