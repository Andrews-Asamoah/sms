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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Send,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import {
  updateTicketStatus,
  addTicketReply,
  assignTicket,
} from "@/app/(system)/support/actions";

const statusColors: Record<string, string> = {
  OPEN: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  IN_PROGRESS:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  RESOLVED:
    "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  CLOSED: "border-muted bg-muted/50 text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-blue-600 dark:text-blue-400",
  HIGH: "text-orange-600 dark:text-orange-400",
  URGENT: "text-red-600 dark:text-red-400 font-bold",
};

interface TicketDetailClientProps {
  ticket: any;
  superAdmins: { id: string; name: string }[];
  currentUserId: string;
}

export function TicketDetailClient({
  ticket,
  superAdmins,
  currentUserId,
}: TicketDetailClientProps) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState(ticket.status);
  const [assignedToId, setAssignedToId] = useState<string>(
    ticket.assignedToId ?? "__none__",
  );
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: string) => {
    const prev = status;
    setStatus(newStatus);
    startTransition(async () => {
      const result = await updateTicketStatus(ticket.id, newStatus as any);
      if (result.success) {
        toast.success("Status updated.");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update status.");
        setStatus(prev);
      }
    });
  };

  const handleAssign = (value: string) => {
    const prev = assignedToId;
    setAssignedToId(value);
    startTransition(async () => {
      const result = await assignTicket(
        ticket.id,
        value === "__none__" ? null : value,
      );
      if (result.success) {
        toast.success("Ticket assigned.");
      } else {
        toast.error(result.error || "Failed to assign.");
        setAssignedToId(prev);
      }
    });
  };

  const handleReply = () => {
    if (!reply.trim()) return;
    startTransition(async () => {
      const result = await addTicketReply(ticket.id, reply.trim());
      if (result.success) {
        toast.success("Reply sent.");
        setReply("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to send reply.");
      }
    });
  };

  const isClosed = status === "CLOSED";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/support">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main thread */}
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
                    <Badge
                      variant="outline"
                      className={statusColors[status] || ""}
                    >
                      {status.replace("_", " ")}
                    </Badge>
                    <span
                      className={`text-sm font-semibold ${priorityColors[ticket.priority]}`}
                    >
                      {ticket.priority} priority
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
              <div className="mt-4 pt-4 border-t flex items-center gap-3 text-sm text-muted-foreground">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={ticket.submittedBy.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {ticket.submittedBy.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>
                  Submitted by <strong>{ticket.submittedBy.name}</strong>
                  {ticket.school && ` (${ticket.school.name})`}
                  {" · "}
                  {format(
                    new Date(ticket.createdAt),
                    "MMM d, yyyy 'at' h:mm a",
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Replies */}
          {ticket.replies.length > 0 && (
            <div className="space-y-3">
              {ticket.replies.map((r: any) => {
                const isSuperAdmin = r.author.role === "superAdmin";
                return (
                  <Card
                    key={r.id}
                    className={
                      isSuperAdmin ? "border-primary/20 bg-primary/5" : ""
                    }
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={r.author.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {r.author.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold">
                              {r.author.name}
                            </span>
                            {isSuperAdmin && (
                              <Badge variant="default" className="text-xs gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                Support Team
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {format(
                                new Date(r.createdAt),
                                "MMM d 'at' h:mm a",
                              )}
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
          {!isClosed && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <Textarea
                  placeholder="Write a reply to the school admin..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  className="resize-none"
                  disabled={isPending}
                />
                <div className="flex items-center justify-between">
                  {status === "RESOLVED" && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      Waiting for school admin to confirm resolution.
                    </p>
                  )}
                  <div className="ml-auto">
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
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manage Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Status */}
              <div>
                <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground block mb-1.5">
                  Status
                </label>
                <Select
                  value={status}
                  onValueChange={handleStatusChange}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assign to */}
              {superAdmins.length > 0 && (
                <div>
                  <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground block mb-1.5">
                    <UserCheck className="inline h-3.5 w-3.5 mr-1" />
                    Assigned To
                  </label>
                  <Select
                    value={assignedToId}
                    onValueChange={handleAssign}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Unassigned</SelectItem>
                      {superAdmins.map((sa) => (
                        <SelectItem key={sa.id} value={sa.id}>
                          {sa.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Meta */}
              <div className="space-y-3 pt-2 border-t text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                    Priority
                  </p>
                  <p className={`font-semibold ${priorityColors[ticket.priority]}`}>
                    {ticket.priority}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                    Submitted By
                  </p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {ticket.submittedBy.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{ticket.submittedBy.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.submittedBy.email}
                      </p>
                    </div>
                  </div>
                </div>
                {ticket.school && (
                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                      School
                    </p>
                    <p>{ticket.school.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                    Created
                  </p>
                  <p className="text-muted-foreground">
                    {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
