// app/(school)/[schoolSlug]/admin/communications/messages/page.tsx
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { Metadata } from "next";
import { SchoolSMSComposer } from "@/components/school/sms-composer";

export const metadata: Metadata = {
  title: "Send SMS | Communications",
  description: "Send SMS messages to your school's guardians, teachers, and staff",
};

interface MessagesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) redirect("/auth/login");

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: {
      id: true,
      name: true,
      settings: true,
      organizationId: true,
      _count: {
        select: {
          guardians: { where: { isActive: true, deletedAt: null } },
          teachers: { where: { isActive: true, deletedAt: null } },
          staff: { where: { isActive: true, deletedAt: null } },
        },
      },
      smsLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          audienceType: true,
          recipientCount: true,
          message: true,
          senderId: true,
          batchId: true,
          status: true,
          failedCount: true,
          createdAt: true,
        },
      },
    },
  });

  if (!school) notFound();

  // Authorization check
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
      (member.role.includes("owner") || member.role.includes("admin")));

  if (!isAuthorized) redirect(`/${schoolSlug}/unauthorized`);

  const settings = (school.settings as Record<string, unknown>) || {};
  const hasCustomSMS = Boolean(settings.useCustomSMS);
  const customSenderId = (settings.hubtelSenderId as string) || null;

  return (
    <SchoolSMSComposer
      schoolId={school.id}
      schoolSlug={schoolSlug}
      schoolName={school.name}
      hasCustomSMS={hasCustomSMS}
      customSenderId={customSenderId}
      audienceCounts={{
        guardians: school._count.guardians,
        teachers: school._count.teachers,
        staff: school._count.staff,
      }}
      recentLogs={school.smsLogs}
    />
  );
}
