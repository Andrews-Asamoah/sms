import { requireSuperAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  TicketIcon,
} from "lucide-react";
import { format } from "date-fns";

export const metadata = {
  title: "Support Tickets | SuperAdmin Dashboard",
  description: "Manage support tickets from school admins and owners",
};

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  OPEN: "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  IN_PROGRESS:
    "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  RESOLVED:
    "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
  CLOSED: "border-muted bg-muted/50 text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-blue-600 dark:text-blue-400",
  HIGH: "text-orange-600 dark:text-orange-400",
  URGENT: "text-red-600 dark:text-red-400",
};

export default async function SupportPage() {
  await requireSuperAdmin();

  const tickets = await prisma.supportTicket.findMany({
    where: {
      submittedBy: {
        OR: [
          { role: "superAdmin" },
          {
            members: {
              some: { role: { in: ["admin", "owner"] } },
            },
          },
        ],
      },
    },
    include: {
      submittedBy: {
        select: { id: true, name: true, email: true, image: true },
      },
      school: { select: { name: true, subdomain: true } },
      assignedTo: { select: { name: true } },
      _count: { select: { replies: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = tickets.filter(
    (t) => t.status === "IN_PROGRESS",
  ).length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground mt-2">
            Manage support requests from school administrators and owners.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/10 p-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{openCount}</div>
                <p className="text-sm text-muted-foreground">Open</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-500/10 p-2">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{inProgressCount}</div>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/10 p-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{resolvedCount}</div>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <HelpCircle className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No support tickets</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              When school admins or owners submit support requests, they will
              appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <TicketIcon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {ticket.subject}
                        </span>
                        <Badge
                          variant="outline"
                          className={statusColors[ticket.status] || ""}
                        >
                          {ticket.status.replace("_", " ")}
                        </Badge>
                        <span
                          className={`text-xs font-medium ${priorityColors[ticket.priority]}`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>
                          By <strong>{ticket.submittedBy.name}</strong>
                          {ticket.school && ` · ${ticket.school.name}`}
                        </span>
                        <span>·</span>
                        <span>
                          {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                        </span>
                        {ticket._count.replies > 0 && (
                          <>
                            <span>·</span>
                            <span>{ticket._count.replies} replies</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Link href={`/support/${ticket.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
