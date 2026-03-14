import { requireSuperAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  TicketIcon,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

export const metadata = {
  title: "Support Tickets | SuperAdmin Dashboard",
};

export const dynamic = "force-dynamic";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  OPEN: {
    label: "Open",
    className:
      "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  RESOLVED: {
    label: "Resolved",
    className:
      "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  },
  CLOSED: {
    label: "Closed",
    className: "border-muted bg-muted/50 text-muted-foreground",
  },
};

const priorityBadge: Record<string, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-600 dark:text-blue-400",
  HIGH: "text-orange-600 dark:text-orange-400",
  URGENT: "text-red-600 dark:text-red-400 font-bold",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireSuperAdmin();
  const { status: filterStatus } = await searchParams;

  const allTickets = await prisma.supportTicket.findMany({
    include: {
      submittedBy: {
        select: { id: true, name: true, email: true, image: true },
      },
      school: { select: { name: true, subdomain: true } },
      assignedTo: { select: { name: true } },
      _count: { select: { replies: true } },
    },
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
  });

  const openCount = allTickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = allTickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedCount = allTickets.filter((t) => t.status === "RESOLVED").length;
  const closedCount = allTickets.filter((t) => t.status === "CLOSED").length;

  const tickets = filterStatus
    ? allTickets.filter((t) => t.status === filterStatus.toUpperCase())
    : allTickets;

  const filterTabs = [
    { label: "All", value: undefined, count: allTickets.length },
    { label: "Open", value: "OPEN", count: openCount, icon: AlertCircle, color: "text-blue-500" },
    { label: "In Progress", value: "IN_PROGRESS", count: inProgressCount, icon: Clock, color: "text-amber-500" },
    { label: "Resolved", value: "RESOLVED", count: resolvedCount, icon: CheckCircle, color: "text-green-500" },
    { label: "Closed", value: "CLOSED", count: closedCount, icon: XCircle, color: "text-slate-400" },
  ];

  const activeFilter = filterStatus?.toUpperCase();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
        <p className="text-muted-foreground mt-1">
          Manage support requests from school administrators.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Open", count: openCount, icon: AlertCircle, color: "text-blue-500" },
          { label: "In Progress", count: inProgressCount, icon: Clock, color: "text-amber-500" },
          { label: "Resolved", count: resolvedCount, icon: CheckCircle, color: "text-green-500" },
          { label: "Closed", count: closedCount, icon: XCircle, color: "text-slate-400" },
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => {
          const isActive = tab.value === undefined
            ? !activeFilter
            : activeFilter === tab.value;
          const href = tab.value ? `/support?status=${tab.value.toLowerCase()}` : "/support";
          return (
            <Link key={tab.label} href={href}>
              <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-muted"}`}>
                  {tab.count}
                </span>
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <HelpCircle className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {activeFilter
                ? `No ${activeFilter.toLowerCase().replace("_", " ")} tickets.`
                : "When schools submit support requests, they will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const statusCfg = statusConfig[ticket.status] ?? statusConfig.OPEN;
            return (
              <Link key={ticket.id} href={`/support/${ticket.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer border-border/60 hover:border-primary/20 group">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <TicketIcon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold truncate">
                              {ticket.subject}
                            </span>
                            <Badge variant="outline" className={statusCfg.className}>
                              {statusCfg.label}
                            </Badge>
                            <span className={`text-xs font-semibold ${priorityBadge[ticket.priority]}`}>
                              {ticket.priority}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>
                              By <strong>{ticket.submittedBy.name}</strong>
                              {ticket.school && ` · ${ticket.school.name}`}
                            </span>
                            <span>·</span>
                            <span>{format(new Date(ticket.createdAt), "MMM d, yyyy")}</span>
                            {ticket._count.replies > 0 && (
                              <>
                                <span>·</span>
                                <span>{ticket._count.replies} {ticket._count.replies === 1 ? "reply" : "replies"}</span>
                              </>
                            )}
                            {ticket.assignedTo && (
                              <>
                                <span>·</span>
                                <span className="font-medium">Assigned: {ticket.assignedTo.name}</span>
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
