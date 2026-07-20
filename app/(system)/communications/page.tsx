// app/(system)/communications/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { Metadata } from "next";
import { SystemBroadcastComposer } from "@/components/System/system-broadcast-composer";

export const metadata: Metadata = {
  title: "Broadcast SMS | Communications",
  description: "Send SMS broadcasts to all school owners and admins",
};

export const dynamic = "force-dynamic";

export default async function CommunicationsPage() {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/auth/login");

  // Subscription breakdown for filter stats
  const [totalOrgs, activeOrgs, trialingOrgs, expiredOrgs] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { subscriptionStatus: "ACTIVE" } }),
    prisma.organization.count({ where: { subscriptionStatus: "TRIALING" } }),
    prisma.organization.count({
      where: {
        subscriptionStatus: {
          in: ["CANCELED", "UNPAID", "INCOMPLETE_EXPIRED", "PAST_DUE"],
        },
      },
    }),
  ]);

  // Recent broadcast history
  const recentLogs = await prisma.systemSMSLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <SystemBroadcastComposer
      stats={{ total: totalOrgs, active: activeOrgs, trialing: trialingOrgs, expired: expiredOrgs }}
      recentLogs={recentLogs}
    />
  );
}
