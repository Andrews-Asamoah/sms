"use client";

import { useState, useTransition } from "react";
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
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  updateTicketStatus,
  addTicketReply,
} from "@/app/(system)/support/actions";

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
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState(ticket.status);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    startTransition(async () => {
      const result = await updateTicketStatus(ticket.id, newStatus as any);
      if (result.success) {
        toast.success("Ticket status updated.");
      } else {
        toast.error(result.error || "Failed to update status.");
        setStatus(ticket.status);
      }
    });
  };

  const handleReply = () => {
    if (!reply.trim()) return;
    startTransition(async () => {
      const result = await addTicketReply(ticket.id, reply);
      if (result.success) {
        toast.success("Reply sent.");
        setReply("");
      } else {
        toast.error(result.error || "Failed to send reply.");
      }
    });
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/support">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className={statusColors[status] || ""}
                    >
                      {status.replace("_", " ")}
                    </Badge>
                    <span
                      className={`text-sm font-medium ${priorityColors[ticket.priority]}`}
                    >
                      {ticket.priority} Priority
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
              <div className="mt-4 pt-4 border-t flex items-center gap-3 text-sm text-muted-foreground">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={ticket.submittedBy.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {ticket.submittedBy.name.substring(0, 2).toUpperCase()}
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
              {ticket.replies.map((reply: any) => {
                const isCurrentUser = reply.author.id === currentUserId;
                const isSuperAdmin = reply.author.role === "superAdmin";
                return (
                  <Card
                    key={reply.id}
                    className={
                      isCurrentUser ? "border-primary/20 bg-primary/5" : ""
                    }
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={reply.author.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {reply.author.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {reply.author.name}
                            </span>
                            {isSuperAdmin && (
                              <Badge variant="default" className="text-xs">
                                Support Team
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {format(
                                new Date(reply.createdAt),
                                "MMM d 'at' h:mm a",
                              )}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">
                            {reply.message}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Reply Box */}
          {status !== "CLOSED" && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <Textarea
                  placeholder="Write a reply..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  className="resize-none"
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
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </label>
                <Select
                  value={status}
                  onValueChange={handleStatusChange}
                  disabled={isPending}
                >
                  <SelectTrigger className="mt-1">
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

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Priority
                </label>
                <p
                  className={`text-sm font-medium mt-1 ${priorityColors[ticket.priority]}`}
                >
                  {ticket.priority}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Submitted By
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {ticket.submittedBy.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {ticket.submittedBy.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.submittedBy.email}
                    </p>
                  </div>
                </div>
              </div>

              {ticket.school && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    School
                  </label>
                  <p className="text-sm mt-1">{ticket.school.name}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Created
                </label>
                <p className="text-sm mt-1">
                  {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
