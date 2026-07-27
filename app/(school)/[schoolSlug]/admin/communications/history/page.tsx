// app/(school)/[schoolSlug]/admin/communications/history/page.tsx
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { getUnifiedCommunicationHistory } from "./actions";
import { CommunicationHistoryClient } from "@/components/school/communication-history-client";

export const metadata: Metadata = {
  title: "Sent History | Communications",
  description: "Complete audit log of all sent SMS and email communications",
};

interface HistoryPageProps {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{
    channel?: string;
    status?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function CommunicationHistoryPage({
  params,
  searchParams,
}: HistoryPageProps) {
  const { schoolSlug } = await params;
  const sp = await searchParams;

  const session = await getSession();
  if (!session) redirect("/auth/login");

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
  });

  if (!school) notFound();

  // Authorization
  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: school.organizationId,
        userId: session.user.id,
      },
    },
    select: { role: true },
  });

  const isAuthorized =
    session.isSuperAdmin ||
    (member &&
      ["owner", "admin", "headteacher"].some((r) =>
        member.role.includes(r)
      ));

  if (!isAuthorized) redirect(`/${schoolSlug}/unauthorized`);

  // ── Parse search params ──────────────────────────────────────────────────
  const channel = (sp.channel as "ALL" | "SMS" | "EMAIL") ?? "ALL";
  const status = (sp.status as "ALL" | "SENT" | "FAILED" | "PARTIAL") ?? "ALL";
  const search = sp.search ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const pageSize = 50;

  // ── Fetch data server-side ───────────────────────────────────────────────
  const { data, totalCount } = await getUnifiedCommunicationHistory({
    schoolId: school.id,
    channel,
    status,
    search,
    page,
    pageSize,
  });

  return (
    <CommunicationHistoryClient
      schoolSlug={schoolSlug}
      initialData={data}
      totalCount={totalCount}
      initialFilters={{ channel, status, search, page }}
      pageSize={pageSize}
    />
  );
}
