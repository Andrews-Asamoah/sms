// app/(school)/[schoolSlug]/admin/communications/page.tsx
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { getCommunicationStats } from "./history/actions";
import {
  MessageSquare,
  Mail,
  Megaphone,
  Send,
  History,
  Bell,
  ArrowRight,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export const metadata: Metadata = {
  title: "Communication Center | School Management System",
  description: "Manage all school communications — SMS, email, and announcements",
};

interface PageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function CommunicationsOverviewPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: {
      id: true,
      name: true,
      organizationId: true,
      smsLogs: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          audienceType: true,
          recipientCount: true,
          message: true,
          status: true,
          failedCount: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          announcements: true,
        },
      },
    },
  });

  if (!school) notFound();

  const recentEmailLogs = await prisma.emailLog.findMany({
    where: { schoolId: school.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      recipientEmail: true,
      recipientName: true,
      subject: true,
      category: true,
      status: true,
      createdAt: true,
    },
  });

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
      ["owner", "admin", "headteacher"].some((r) => member.role.includes(r)));

  if (!isAuthorized) redirect(`/${schoolSlug}/unauthorized`);

  const statsResult = await getCommunicationStats(school.id);
  const stats = statsResult.stats ?? {
    totalSMS: 0,
    totalSMSRecipients: 0,
    totalEmails: 0,
    totalAnnouncements: 0,
    failedSMS: 0,
    failedEmails: 0,
  };

  // Merge recent activity (SMS + Email) sorted by date
  const recentActivity = [
    ...school.smsLogs.map((log) => ({
      id: `sms_${log.id}`,
      type: "SMS" as const,
      title: log.audienceType.startsWith("single:")
        ? `Direct SMS → ${log.audienceType.split(":")[2] ?? "recipient"}`
        : `Bulk SMS · ${log.audienceType}`,
      subtitle: log.message,
      status: log.status,
      createdAt: log.createdAt,
    })),
    ...recentEmailLogs.map((email) => ({
      id: `email_${email.id}`,
      type: "EMAIL" as const,
      title: email.subject,
      subtitle: email.recipientName
        ? `${email.recipientName} <${email.recipientEmail}>`
        : email.recipientEmail,
      status: email.status,
      createdAt: email.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const quickActions = [
    {
      href: `/${schoolSlug}/admin/communications/messages`,
      icon: Send,
      label: "Send SMS",
      description: "Broadcast to groups or message an individual",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      href: `/${schoolSlug}/admin/communications/announcements`,
      icon: Megaphone,
      label: "New Announcement",
      description: "Publish a school-wide notice or update",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      href: `/${schoolSlug}/admin/communications/history`,
      icon: History,
      label: "View Sent History",
      description: "Full audit log of all sent SMS and emails",
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      href: `/${schoolSlug}/admin/communications/notifications`,
      icon: Bell,
      label: "Notifications",
      description: "View in-app alerts and system notifications",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  const statCards = [
    {
      label: "SMS Batches Sent",
      value: stats.totalSMS.toLocaleString(),
      sub: `${stats.totalSMSRecipients.toLocaleString()} total deliveries`,
      icon: MessageSquare,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      failed: stats.failedSMS,
    },
    {
      label: "Emails Dispatched",
      value: stats.totalEmails.toLocaleString(),
      sub: "Via Resend email service",
      icon: Mail,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      failed: stats.failedEmails,
    },
    {
      label: "Announcements",
      value: stats.totalAnnouncements.toLocaleString(),
      sub: "Published to school portal",
      icon: Megaphone,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="text-3xl font-extrabold mt-1 tracking-tight">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                    {card.failed != null && card.failed > 0 && (
                      <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {card.failed} failed
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl ${card.bg}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full">
                  <CardContent className="pt-5 pb-5">
                    <div className={`inline-flex p-2.5 rounded-xl ${action.bg} mb-3`}>
                      <Icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm">{action.label}</p>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Recent Activity ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold">Recent Activity</h2>
          <Link href={`/${schoolSlug}/admin/communications/history`}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No communications sent yet. Use the quick actions above to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Channel icon */}
                    <div
                      className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                        item.type === "SMS"
                          ? "bg-blue-500/10"
                          : "bg-violet-500/10"
                      }`}
                    >
                      {item.type === "SMS" ? (
                        <MessageSquare
                          className="h-4 w-4 text-blue-500"
                        />
                      ) : (
                        <Mail className="h-4 w-4 text-violet-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {item.status === "SENT" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1 text-[11px]">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Sent
                        </Badge>
                      ) : item.status === "FAILED" ? (
                        <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 gap-1 text-[11px]">
                          <XCircle className="h-2.5 w-2.5" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px]">
                          {item.status}
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
