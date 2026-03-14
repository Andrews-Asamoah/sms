"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  addAdminReply,
  confirmResolution,
  reopenTicket,
} from "@/app/(system)/support/actions";

const statusConfig: Record<string, { label: string; className: string }> = {
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

const priorityConfig: Record<string, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-600 dark:text-blue-400",
  HIGH: "text-orange-600 dark:text-orange-400",
  URGENT: "text-red-600 dark:text-red-400 font-bold",
};

interface Props {
  ticket: any;
  schoolSlug: string;
  currentUserId: string;
}

export function AdminTicketThreadView({ ticket, schoolSlug, currentUserId }: Props) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [isPending, startTransition] = useTransition();
  const status = statusConfig[ticket.status] ?? statusConfig.OPEN;
  const isResolved = ticket.status === "RESOLVED";
  const isClosed = ticket.status === "CLOSED";
  const canReply = !isClosed;

  const handleReply = () => {
    if (!reply.trim()) return;
    startTransition(async () => {
      const result = await addAdminReply(ticket.id, reply.trim(), schoolSlug);
      if (result.success) {
        toast.success("Reply sent.");
        setReply("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to send reply.");
      }
    });
  };

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await confirmResolution(ticket.id, schoolSlug);
      if (result.success) {
        toast.success("Ticket closed. Thank you for confirming!");
        router.refresh();
      } else {
        toast.error(result.error || "Something went wrong.");
      }
    });
  };

  const handleReopen = () => {
    startTransition(async () => {
      const result = await reopenTicket(ticket.id, schoolSlug);
      if (result.success) {
        toast.success("Ticket reopened. Our team will follow up.");
        router.refresh();
      } else {
        toast.error(result.error || "Something went wrong.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/${schoolSlug}/admin/support`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Support
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Thread */}
        <div className="lg:col-span-2 space-y-4">
          {/* Ticket Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl leading-snug">
                    {ticket.subject}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                    <span
                      className={`text-sm font-semibold ${
                        priorityConfig[ticket.priority]
                      }`}
                    >
                      {ticket.priority} priority
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {ticket.description}
              </p>
              <div className="mt-4 pt-4 border-t flex items-center gap-3 text-sm text-muted-foreground">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={ticket.submittedBy.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {ticket.submittedBy.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>
                  Submitted by <strong>{ticket.submittedBy.name}</strong>
                  {" · "}
                  {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Resolution Banner */}
          {isResolved && (
            <Card className="border-green-500/40 bg-green-500/5">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300">
                      Our team has marked this ticket as resolved
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please verify that your issue has been fully addressed. You can confirm to close the ticket or reopen it if the problem persists.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Confirm — Issue Fixed
                  </Button>
                  <Button
                    onClick={handleReopen}
                    disabled={isPending}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Reopen — Still an Issue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Closed Banner */}
          {isClosed && (
            <Card className="border-muted bg-muted/30">
              <CardContent className="flex items-center gap-3 pt-5">
                <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  This ticket has been closed. If you have a new issue, please{" "}
                  <Link
                    href={`/${schoolSlug}/admin/support/new`}
                    className="underline underline-offset-4 text-foreground"
                  >
                    submit a new ticket
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          )}

          {/* Replies thread */}
          {ticket.replies.length > 0 && (
            <div className="space-y-3">
              {ticket.replies.map((r: any) => {
                const isSupportTeam = r.author.role === "superAdmin";
                const isMe = r.author.id === currentUserId;
                return (
                  <Card
                    key={r.id}
                    className={
                      isSupportTeam
                        ? "border-primary/20 bg-primary/5"
                        : isMe
                        ? "border-slate-200 dark:border-slate-700"
                        : ""
                    }
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={r.author.image ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {r.author.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold">
                              {isSupportTeam ? "Support Team" : r.author.name}
                            </span>
                            {isSupportTeam && (
                              <Badge variant="default" className="text-xs gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                Support Team
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {format(new Date(r.createdAt), "MMM d 'at' h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {r.message}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Reply box */}
          {canReply && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <Textarea
                  placeholder="Add a reply or additional information..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  className="resize-none"
                  disabled={isPending}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleReply}
                    disabled={isPending || !reply.trim()}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Reply
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                  Status
                </label>
                <Badge variant="outline" className={`mt-1.5 block w-fit ${status.className}`}>
                  {status.label}
                </Badge>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                  Priority
                </label>
                <p className={`mt-1 font-semibold ${priorityConfig[ticket.priority]}`}>
                  {ticket.priority}
                </p>
              </div>
              {ticket.assignedTo && (
                <div>
                  <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                    Assigned To
                  </label>
                  <p className="mt-1">{ticket.assignedTo.name}</p>
                </div>
              )}
              <div>
                <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                  Submitted
                </label>
                <p className="mt-1 text-muted-foreground">
                  {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                  Replies
                </label>
                <p className="mt-1">
                  {ticket.replies.length === 0
                    ? "None yet"
                    : `${ticket.replies.length} message${ticket.replies.length > 1 ? "s" : ""}`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
                <p>Our team typically responds within 1–2 business days.</p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                <p>Urgent issues are prioritised and addressed faster.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
