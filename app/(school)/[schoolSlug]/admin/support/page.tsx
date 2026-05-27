import React from "react";
import { requireAuth } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  PlusCircle,
  TicketIcon,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  return { title: `Support | ${schoolSlug}` };
}

const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  OPEN: {
    label: "Open",
    className:
      "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    icon: AlertCircle,
  },
  IN_PROGRESS: {
    label: "In Progress",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: Clock,
  },
  RESOLVED: {
    label: "Resolved",
    className:
      "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
    icon: CheckCircle,
  },
  CLOSED: {
    label: "Closed",
    className: "border-muted bg-muted/50 text-muted-foreground",
    icon: XCircle,
  },
};

const priorityBadge: Record<string, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-600 dark:text-blue-400",
  HIGH: "text-orange-600 dark:text-orange-400",
  URGENT: "text-red-600 dark:text-red-400 font-bold",
};

type Ticket = {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  isInternal: boolean;
  createdAt: Date;
  submittedBy: { name: string; role: string };
  assignedTo: { name: string } | null;
  _count: { replies: number };
};

export default async function AdminSupportPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  await requireAuth();

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, name: true },
  });
  if (!school) notFound();

  const tickets = (await prisma.supportTicket.findMany({
    where: { schoolId: school.id },
    include: {
      submittedBy: { select: { name: true, role: true } },
      assignedTo: { select: { name: true } },
      _count: { select: { replies: true } },
    },
    orderBy: { createdAt: "desc" },
  })) as Ticket[];

  const externalTickets = tickets.filter(t => !t.isInternal);
  const internalTickets = tickets.filter(t => t.isInternal);

  const renderTicketList = (list: Ticket[], isInternalTab: boolean) => {
    if (list.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <HelpCircle className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tickets yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              {isInternalTab 
                ? "There are no internal reports from your students, teachers, or guardians."
                : "Submit a support request and our team will get back to you promptly."}
            </p>
            {!isInternalTab && (
              <Button asChild>
                <Link href={`/${schoolSlug}/admin/support/new`}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Submit Your First Ticket
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3 mt-4">
        {list.map((ticket) => {
          const status = statusConfig[ticket.status] ?? statusConfig.OPEN;
          return (
            <Link
              key={ticket.id}
              href={`/${schoolSlug}/admin/support/${ticket.id}`}
            >
              <Card className="hover:shadow-md transition-all cursor-pointer border-border/60 hover:border-primary/20 group">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <TicketIcon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground truncate">
                            {ticket.subject}
                          </span>
                          <Badge
                            variant="outline"
                            className={status.className}
                          >
                            {status.label}
                          </Badge>
                          <span
                            className={`text-xs font-semibold ${priorityBadge[ticket.priority]}`}
                          >
                            {ticket.priority}
                          </span>
                          {ticket.category && (
                            <Badge variant="secondary" className="font-normal text-[10px]">
                              {ticket.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>
                            {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                          </span>
                          {isInternalTab && (
                            <>
                              <span>·</span>
                              <span>By: {ticket.submittedBy.name} ({ticket.submittedBy.role})</span>
                            </>
                          )}
                          {ticket._count.replies > 0 && (
                            <>
                              <span>·</span>
                              <span>
                                {ticket._count.replies}{" "}
                                {ticket._count.replies === 1 ? "reply" : "replies"}
                              </span>
                            </>
                          )}
                          {!isInternalTab && ticket.assignedTo && (
                            <>
                              <span>·</span>
                              <span>Assigned to {ticket.assignedTo.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    );
  };

  const getStats = (list: Ticket[]) => ({
    open: list.filter((t) => t.status === "OPEN").length,
    inProgress: list.filter((t) => t.status === "IN_PROGRESS").length,
    resolved: list.filter((t) => t.status === "RESOLVED").length,
    closed: list.filter((t) => t.status === "CLOSED").length,
  });

  const extStats = getStats(externalTickets);
  const intStats = getStats(internalTickets);
  const resolvedExternal = externalTickets.filter(t => t.status === "RESOLVED");
  const openInternal = internalTickets.filter(t => t.status === "OPEN");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Hub</h1>
          <p className="text-muted-foreground mt-1">
            Manage system support and internal school reports.
          </p>
        </div>
        <Button asChild>
          <Link href={`/${schoolSlug}/admin/support/new`}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Ticket to System Admin
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="internal" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="internal" className="relative">
            Internal Reports
            {openInternal.length > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="external" className="relative">
            System Support
            {resolvedExternal.length > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-green-500" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* INTERNAL TAB */}
        <TabsContent value="internal" className="mt-6 space-y-6">
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-primary">Internal School Reports</p>
              <p className="text-sm text-muted-foreground mt-1">
                These are reports and tickets submitted by your school's teachers, students, and guardians. 
                As a school admin, you are responsible for resolving them.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "New", count: intStats.open, icon: AlertCircle, color: "text-red-500" },
              { label: "In Progress", count: intStats.inProgress, icon: Clock, color: "text-amber-500" },
              { label: "Resolved", count: intStats.resolved, icon: CheckCircle, color: "text-green-500" },
              { label: "Closed", count: intStats.closed, icon: XCircle, color: "text-slate-400" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                    <div>
                      <div className="text-2xl font-bold">{s.count}</div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {renderTicketList(internalTickets, true)}
        </TabsContent>

        {/* EXTERNAL TAB */}
        <TabsContent value="external" className="mt-6 space-y-6">
          {resolvedExternal.length > 0 && (
            <Card className="border-green-500/40 bg-green-500/5">
              <CardContent className="flex items-start gap-3 pt-5">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300">
                    {resolvedExternal.length} ticket{resolvedExternal.length > 1 ? "s" : ""} resolved — your action needed
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    The system support team has resolved some of your tickets. Please confirm or reopen each one.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {resolvedExternal.map((t) => (
                      <Button
                        key={t.id}
                        variant="outline"
                        size="sm"
                        asChild
                        className="border-green-500/40 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                      >
                        <Link href={`/${schoolSlug}/admin/support/${t.id}`}>
                          {t.subject}
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Open", count: extStats.open, icon: AlertCircle, color: "text-blue-500" },
              { label: "In Progress", count: extStats.inProgress, icon: Clock, color: "text-amber-500" },
              { label: "Resolved", count: extStats.resolved, icon: CheckCircle, color: "text-green-500" },
              { label: "Closed", count: extStats.closed, icon: XCircle, color: "text-slate-400" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                    <div>
                      <div className="text-2xl font-bold">{s.count}</div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {renderTicketList(externalTickets, false)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
