"use client";

import { useState, useTransition, useRef } from "react";
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
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
  X,
  ExternalLink,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
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
    className: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  RESOLVED: {
    label: "Resolved",
    className: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
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

function AttachmentPreview({ url }: { url: string }) {
  if (!url) return null;
  const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
  
  if (isImage) {
    return (
      <div className="mt-3 rounded-lg overflow-hidden border max-w-sm">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt="Attachment preview" className="w-full h-auto object-cover max-h-64 hover:opacity-90 transition-opacity" />
        </a>
      </div>
    );
  }
  
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50 hover:bg-muted text-sm transition-colors"
    >
      <ExternalLink className="h-4 w-4 text-primary" />
      <span className="font-medium truncate max-w-[200px]">View Attachment</span>
    </a>
  );
}

export function AdminTicketThreadView({ ticket, schoolSlug, currentUserId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  const status = statusConfig[ticket.status] ?? statusConfig.OPEN;
  const isResolved = ticket.status === "RESOLVED";
  const isClosed = ticket.status === "CLOSED";
  const canReply = !isClosed;

  const handleReply = async () => {
    if (!reply.trim()) return;
    
    let attachmentUrl: string | undefined = undefined;

    if (file) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "support");

        const res = await fetch(`/api/schools/${schoolSlug}/upload`, {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) throw new Error("Failed to upload file");
        
        const data = await res.json();
        attachmentUrl = data.url;
      } catch (error: any) {
        setIsUploading(false);
        toast.error(`Upload failed: ${error.message}`);
        return;
      }
    }

    startTransition(async () => {
      const result = await addAdminReply(ticket.id, reply.trim(), schoolSlug, attachmentUrl);
      if (result.success) {
        toast.success("Reply sent.");
        setReply("");
        setFile(null);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } else {
        setIsUploading(false);
        toast.error(result.error || "Failed to send reply.");
      }
    });
  };

  const handleConfirm = () => {
    if (!rating) {
      toast.error("Please provide a satisfaction rating before closing.");
      return;
    }
    startTransition(async () => {
      // confirmResolution could be updated to accept rating, but for now we just call it
      const result = await confirmResolution(ticket.id, schoolSlug);
      if (result.success) {
        toast.success("Ticket closed. Thank you for your feedback!");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File size should not exceed 5MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFile(selectedFile);
    }
  };

  // Determine back link logic depending on internal or external portal
  let basePath = "admin/support";
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.includes("/teacher/reports")) {
      basePath = "teacher/reports";
    } else if (path.includes("/student/support")) {
      basePath = "student/support";
    } else if (path.includes("/guardian/support")) {
      basePath = "guardian/support";
    } else if (ticket.isInternal) {
      basePath = "teacher/reports";
    }
  } else if (ticket.isInternal) {
    basePath = "teacher/reports";
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/${schoolSlug}/${basePath}`}>
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
                    <span className={`text-sm font-semibold ${priorityConfig[ticket.priority]}`}>
                      {ticket.priority} priority
                    </span>
                    {ticket.category && (
                      <Badge variant="secondary" className="font-normal text-xs">
                        {ticket.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {ticket.description}
              </p>
              
              <AttachmentPreview url={ticket.attachmentUrl} />

              <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
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
                {ticket.isInternal && (
                  <Badge variant="outline" className="ml-auto bg-primary/5 text-primary text-xs border-primary/20">
                    Internal Report
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resolution Banner */}
          {isResolved && (
            <Card className="border-green-500/40 bg-green-500/5">
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300">
                      Our team has marked this ticket as resolved
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please verify that your issue has been fully addressed.
                    </p>
                  </div>
                </div>
                
                <div className="bg-background/60 p-4 rounded-lg border border-green-500/20">
                  <p className="text-sm font-medium mb-3">How satisfied are you with the resolution?</p>
                  <div className="flex gap-2 mb-4">
                    <Button 
                      variant={rating === "up" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setRating("up")}
                      className={rating === "up" ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Satisfied
                    </Button>
                    <Button 
                      variant={rating === "down" ? "destructive" : "outline"} 
                      size="sm"
                      onClick={() => setRating("down")}
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Unsatisfied
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleConfirm}
                      disabled={isPending || !rating}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Confirm & Close Ticket
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
                    href={`/${schoolSlug}/${basePath}/new`}
                    className="underline underline-offset-4 text-foreground font-medium hover:text-primary transition-colors"
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
                const isSupportTeam = ticket.isInternal 
                  ? ["admin", "owner", "headteacher"].includes(r.author.role) // Internal support
                  : r.author.role === "superAdmin"; // External support
                
                const isMe = r.author.id === currentUserId;
                
                return (
                  <Card
                    key={r.id}
                    className={
                      isSupportTeam
                        ? "border-primary/30 bg-primary/5 shadow-sm"
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
                            <span className="text-sm font-semibold text-foreground">
                              {isSupportTeam ? (ticket.isInternal ? "School Admin" : "System Support") : r.author.name}
                            </span>
                            {isSupportTeam && (
                              <Badge variant="default" className="text-[10px] uppercase gap-1 px-1.5 py-0">
                                <ShieldCheck className="h-3 w-3" />
                                Support Team
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(r.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground mt-2">
                            {r.message}
                          </p>
                          
                          <AttachmentPreview url={r.attachmentUrl} />
                          
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
            <Card className="border-primary/10 shadow-sm">
              <CardContent className="pt-4 space-y-3">
                <Textarea
                  placeholder="Add a reply or additional information..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  className="resize-none focus-visible:ring-primary/20"
                  disabled={isPending || isUploading}
                />
                
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPending || isUploading}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attach File
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                    {file && (
                      <div className="flex items-center gap-2 text-xs bg-muted/50 px-2.5 py-1 rounded-md border">
                        <ImageIcon className="h-3 w-3 text-primary" />
                        <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                        <button 
                          type="button" 
                          className="text-muted-foreground hover:text-foreground shrink-0 ml-1"
                          onClick={() => {
                            setFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleReply}
                    disabled={isPending || isUploading || !reply.trim()}
                    className="min-w-[120px]"
                  >
                    {(isPending || isUploading) ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {isUploading ? "Uploading..." : "Send Reply"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm pt-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1.5">
                  Status
                </label>
                <Badge variant="outline" className={`w-fit ${status.className}`}>
                  {status.label}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                    Priority
                  </label>
                  <p className={`font-semibold ${priorityConfig[ticket.priority]}`}>
                    {ticket.priority}
                  </p>
                </div>
                {ticket.category && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                      Category
                    </label>
                    <p className="font-medium">{ticket.category}</p>
                  </div>
                )}
              </div>
              
              <div className="pt-2 border-t border-border/50">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                  Submitted On
                </label>
                <p className="text-muted-foreground font-medium">
                  {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              
              {ticket.assignedTo && (
                <div className="pt-2 border-t border-border/50">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                    Assigned To
                  </label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={ticket.assignedTo.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {ticket.assignedTo.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{ticket.assignedTo.name}</p>
                  </div>
                </div>
              )}
              
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="pt-4 text-sm text-foreground/80 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">Our team typically responds within 1–2 business days.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">Urgent issues are prioritised and addressed faster.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
