import React from "react";
import { requireAuth } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  PlusCircle,
  TicketIcon,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  return { title: `Support & Help | ${schoolSlug}` };
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
    label: "Resolved — Action Required",
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

export default async function StudentSupportPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await requireAuth();

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, name: true },
  });
  if (!school) notFound();

  const tickets = await prisma.supportTicket.findMany({
    where: { 
      schoolId: school.id,
      submittedById: session.user.id,
      isInternal: true
    },
    include: {
      _count: { select: { replies: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const open = tickets.filter((t) => t.status === "OPEN").length;
  const inProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolved = tickets.filter((t) => t.status === "RESOLVED").length;
  const closed = tickets.filter((t) => t.status === "CLOSED").length;
  const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED");

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support & Help</h1>
          <p className="text-muted-foreground mt-1">
            Need help? Ask school admins or report an issue.
          </p>
        </div>
        <Button asChild>
          <Link href={`/${schoolSlug}/student/support/new`}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Ticket
          </Link>
        </Button>
      </div>

      {/* Resolved banner */}
      {resolvedTickets.length > 0 && (
        <Card className="border-green-500/40 bg-green-500/5">
          <CardContent className="flex items-start gap-3 pt-5">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">
                {resolvedTickets.length} ticket{resolvedTickets.length > 1 ? "s" : ""} resolved — action required
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                The school administrator has resolved your ticket. Please click to verify or reopen.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {resolvedTickets.map((t) => (
                  <Button
                    key={t.id}
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-green-500/40 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                  >
                    <Link href={`/${schoolSlug}/student/support/${t.id}`}>
                      {t.subject}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Open", count: open, icon: AlertCircle, color: "text-blue-500" },
          { label: "In Progress", count: inProgress, icon: Clock, color: "text-amber-500" },
          { label: "Resolved", count: resolved, icon: CheckCircle, color: "text-green-500" },
          { label: "Closed", count: closed, icon: XCircle, color: "text-slate-400" },
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

      {/* Ticket list */}
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <HelpCircle className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No support tickets</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              Create a support ticket to get help from the school administration.
            </p>
            <Button asChild>
              <Link href={`/${schoolSlug}/student/support/new`}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Submit Your First Ticket
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const status = statusConfig[ticket.status] ?? statusConfig.OPEN;
            return (
              <Link
                key={ticket.id}
                href={`/${schoolSlug}/student/support/${ticket.id}`}
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
                            {ticket._count.replies > 0 && (
                              <>
                                <span>·</span>
                                <span>
                                  {ticket._count.replies}{" "}
                                  {ticket._count.replies === 1 ? "reply" : "replies"}
                                </span>
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
      )}
    </div>
  );
}
