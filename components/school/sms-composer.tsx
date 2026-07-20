// components/school/sms-composer.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  MessageSquare,
  Users,
  UserCheck,
  Briefcase,
  Send,
  Loader2,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  sendSchoolSMS,
  previewSMSRecipientCount,
  type SMSAudienceType,
} from "@/app/(school)/[schoolSlug]/admin/communications/messages/actions";
import { formatDistanceToNow } from "date-fns";

const MAX_SMS_CHARS = 160;

const AUDIENCE_OPTIONS: {
  key: SMSAudienceType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    key: "guardians",
    label: "Guardians / Parents",
    description: "All active guardians and parents",
    icon: Users,
    color: "text-blue-500",
  },
  {
    key: "teachers",
    label: "Teachers",
    description: "All active teaching staff",
    icon: UserCheck,
    color: "text-green-500",
  },
  {
    key: "staff",
    label: "Staff",
    description: "All active non-teaching staff",
    icon: Briefcase,
    color: "text-purple-500",
  },
];

interface SMSLog {
  id: string;
  audienceType: string;
  recipientCount: number;
  message: string;
  senderId: string;
  batchId: string | null;
  status: string;
  failedCount: number;
  createdAt: Date;
}

interface SchoolSMSComposerProps {
  schoolId: string;
  schoolSlug: string;
  schoolName: string;
  hasCustomSMS: boolean;
  customSenderId: string | null;
  audienceCounts: {
    guardians: number;
    teachers: number;
    staff: number;
  };
  recentLogs: SMSLog[];
}

export function SchoolSMSComposer({
  schoolId,
  schoolSlug,
  schoolName,
  hasCustomSMS,
  customSenderId,
  audienceCounts,
  recentLogs: initialLogs,
}: SchoolSMSComposerProps) {
  const [message, setMessage] = useState("");
  const [selectedAudiences, setSelectedAudiences] = useState<SMSAudienceType[]>([]);
  const [isPending, startTransition] = useTransition();
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [logs, setLogs] = useState<SMSLog[]>(initialLogs);
  const [lastResult, setLastResult] = useState<{
    sent?: number;
    failed?: number;
    batchId?: string;
  } | null>(null);

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / MAX_SMS_CHARS) || 1;
  const charsRemaining = MAX_SMS_CHARS * smsCount - charCount;
  const isOverLimit = charCount === 0;

  function toggleAudience(key: SMSAudienceType) {
    setSelectedAudiences((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    setPreviewCount(null);
  }

  function getAudienceCount(key: SMSAudienceType): number {
    if (key === "all") return 0;
    return audienceCounts[key] ?? 0;
  }

  async function handlePreview() {
    if (selectedAudiences.length === 0) {
      toast.warning("Select at least one audience group to preview");
      return;
    }
    setIsPreviewLoading(true);
    try {
      const result = await previewSMSRecipientCount(schoolId, selectedAudiences);
      if (result.success) {
        setPreviewCount(result.count ?? 0);
      } else {
        toast.error(result.error || "Failed to get recipient count");
      }
    } catch {
      toast.error("Failed to preview recipient count");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  function handleSend() {
    if (message.trim().length === 0) {
      toast.error("Please type a message before sending");
      return;
    }
    if (selectedAudiences.length === 0) {
      toast.error("Please select at least one audience group");
      return;
    }

    startTransition(async () => {
      try {
        const result = await sendSchoolSMS({
          schoolId,
          schoolSlug,
          message: message.trim(),
          audienceTypes: selectedAudiences,
        });

        if (result.success) {
          setLastResult({
            sent: result.sent,
            failed: result.failed,
            batchId: result.batchId,
          });
          toast.success(
            `✅ SMS sent to ${result.sent ?? result.recipientCount} recipient${(result.sent ?? 0) !== 1 ? "s" : ""}${
              result.failed && result.failed > 0
                ? ` (${result.failed} failed)`
                : ""
            }`
          );
          setMessage("");
          setSelectedAudiences([]);
          setPreviewCount(null);
          // Refresh logs optimistically — next navigation will fetch fresh
        } else {
          toast.error(result.error || "Failed to send SMS");
        }
      } catch {
        toast.error("An unexpected error occurred");
      }
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "SENT":
        return (
          <Badge className="bg-green-500/10 text-green-700 border-green-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Sent
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30 gap-1">
            <AlertCircle className="h-3 w-3" /> Partial
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-500/10 text-red-700 border-red-500/30 gap-1">
            <XCircle className="h-3 w-3" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  const totalSelected = selectedAudiences.reduce(
    (acc, key) => acc + getAudienceCount(key),
    0
  );

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-blue-500" />
            Send SMS
          </h1>
          <p className="text-muted-foreground mt-1">
            Send messages to {schoolName}&apos;s guardians, teachers, and staff
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasCustomSMS ? (
            <Badge className="bg-green-500/10 text-green-700 border-green-500/30 gap-1 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Custom Gateway: {customSenderId || "Configured"}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 px-3 py-1">
              <Info className="h-3.5 w-3.5" />
              Platform Gateway
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Composer (left/main) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Audience Picker */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Select Audience
              </CardTitle>
              <CardDescription>
                Choose which groups will receive this message
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {AUDIENCE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const count = getAudienceCount(opt.key);
                  const checked = selectedAudiences.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleAudience(opt.key)}
                      className={cn(
                        "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-200 hover:bg-muted/50",
                        checked
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                          : "border-border"
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <Icon className={cn("h-5 w-5", opt.color)} />
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleAudience(opt.key)}
                          className="pointer-events-none"
                          aria-label={`Select ${opt.label}`}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {count.toLocaleString()} recipient{count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Preview recipient count */}
              {selectedAudiences.length > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePreview}
                    disabled={isPreviewLoading}
                    className="gap-2"
                  >
                    {isPreviewLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Preview Recipients
                  </Button>
                  {previewCount !== null && (
                    <p className="text-sm font-medium text-muted-foreground">
                      ~{" "}
                      <span className="text-foreground font-bold">
                        {previewCount.toLocaleString()}
                      </span>{" "}
                      unique phone number{previewCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Composer */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Message
              </CardTitle>
              <CardDescription>
                Compose your SMS message. Keep it concise and professional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Textarea
                  id="sms-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here…"
                  rows={5}
                  className="resize-none pr-2 text-base leading-relaxed"
                  maxLength={MAX_SMS_CHARS * 3}
                />
              </div>
              {/* Character counter */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {charCount} character{charCount !== 1 ? "s" : ""}
                  {smsCount > 1 && (
                    <span className="ml-2 text-yellow-600 font-medium">
                      ({smsCount} SMS parts)
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    charsRemaining < 20 && charCount > 0
                      ? "text-red-500 font-bold"
                      : ""
                  )}
                >
                  {charsRemaining} remaining in part {smsCount}
                </span>
              </div>

              {/* Last send result */}
              {lastResult && (
                <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-300">
                      Last send: {lastResult.sent ?? 0} delivered
                      {lastResult.failed
                        ? `, ${lastResult.failed} failed`
                        : ""}
                    </p>
                    {lastResult.batchId && (
                      <p className="text-xs text-green-700/70 dark:text-green-400/70 font-mono mt-0.5">
                        Batch ID: {lastResult.batchId}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Send button */}
              <Button
                id="send-sms-btn"
                onClick={handleSend}
                disabled={
                  isPending ||
                  isOverLimit ||
                  selectedAudiences.length === 0
                }
                className="w-full gap-2 h-11 text-base font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send SMS
                    {selectedAudiences.length > 0 && totalSelected > 0 && (
                      <span className="ml-1 opacity-80">
                        (~{(previewCount ?? totalSelected).toLocaleString()}{" "}
                        recipients)
                      </span>
                    )}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — SMS History */}
        <div className="lg:col-span-1">
          <Card className="border shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Recent Messages
              </CardTitle>
              <CardDescription>Last 20 SMS sends</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No messages sent yet
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        {getStatusBadge(log.status)}
                        <span className="text-xs text-muted-foreground capitalize">
                          {log.audienceType}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2 leading-snug mt-1">
                        {log.message}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {log.recipientCount} recipient
                          {log.recipientCount !== 1 ? "s" : ""}
                          {log.failedCount > 0 && (
                            <span className="text-red-500 ml-1">
                              ({log.failedCount} failed)
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                          })}
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
    </div>
  );
}
