// app/(school)/[schoolSlug]/admin/subscription/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Metadata } from "next";
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

  // Only owners and admins (and superadmins) can access
  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findFirst({
    where: {
      OR: [{ id: schoolSlug }, { subdomain: schoolSlug }],
    },
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

  // Serialize Decimals for Client Component (Next.js 16 doesn't support Decimal objects in props)
  const serializedSchool = JSON.parse(JSON.stringify(school));

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
        school={serializedSchool}
        isSuperAdmin={session.isSuperAdmin}
      />
    </div>
  );
}
