// components/System/system-broadcast-composer.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Loader2,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Users,
  Crown,
  Clock,
  AlertTriangle,
  Radio,
  Info,
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
import { cn } from "@/lib/utils";
import {
  sendSystemBroadcastSMS,
  previewSystemRecipientCount,
  type SystemSMSFilter,
} from "@/app/(system)/communications/actions";
import { formatDistanceToNow } from "date-fns";

const MAX_SMS_CHARS = 160;

const FILTER_OPTIONS: {
  key: SystemSMSFilter;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    key: "all",
    label: "All Schools",
    description: "Every school owner & admin",
    icon: Users,
    color: "text-slate-600 dark:text-slate-300",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
    borderColor: "border-slate-200 dark:border-slate-700",
  },
  {
    key: "active",
    label: "Active Plans",
    description: "Currently subscribed schools",
    icon: Crown,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50/50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-900/50",
  },
  {
    key: "trialing",
    label: "On Trial",
    description: "Schools on a trial period",
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50/50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-900/50",
  },
  {
    key: "expired",
    label: "Expired / Canceled",
    description: "Lapsed or canceled schools",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50/50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-900/50",
  },
];

interface SystemSMSLog {
  id: string;
  message: string;
  targetFilter: string;
  recipientCount: number;
  batchId: string | null;
  status: string;
  failedCount: number;
  createdAt: Date;
}

interface SystemBroadcastComposerProps {
  stats: {
    total: number;
    active: number;
    trialing: number;
    expired: number;
  };
  recentLogs: SystemSMSLog[];
}

export function SystemBroadcastComposer({
  stats,
  recentLogs,
}: SystemBroadcastComposerProps) {
  const [message, setMessage] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<SystemSMSFilter>("all");
  const [isPending, startTransition] = useTransition();
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    sent?: number;
    failed?: number;
    batchId?: string;
  } | null>(null);

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / MAX_SMS_CHARS) || 1;
  const charsRemaining = MAX_SMS_CHARS * smsCount - charCount;

  function getStatForFilter(key: SystemSMSFilter): number {
    switch (key) {
      case "all": return stats.total;
      case "active": return stats.active;
      case "trialing": return stats.trialing;
      case "expired": return stats.expired;
    }
  }

  async function handlePreview() {
    setIsPreviewLoading(true);
    try {
      const result = await previewSystemRecipientCount(selectedFilter);
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

    startTransition(async () => {
      try {
        const result = await sendSystemBroadcastSMS({
          message: message.trim(),
          targetFilter: selectedFilter,
        });

        if (result.success) {
          setLastResult({
            sent: result.sent,
            failed: result.failed,
            batchId: result.batchId,
          });
          toast.success(
            `✅ Broadcast sent to ${result.sent ?? result.recipientCount} school admin${(result.sent ?? 0) !== 1 ? "s" : ""}` +
              (result.failed && result.failed > 0
                ? ` (${result.failed} failed)`
                : "")
          );
          setMessage("");
          setPreviewCount(null);
        } else {
          toast.error(result.error || "Broadcast failed");
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
          <Badge className="bg-green-500/10 text-green-700 border-green-500/30 gap-1 shrink-0">
            <CheckCircle2 className="h-3 w-3" /> Sent
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30 gap-1 shrink-0">
            <AlertCircle className="h-3 w-3" /> Partial
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-500/10 text-red-700 border-red-500/30 gap-1 shrink-0">
            <XCircle className="h-3 w-3" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="shrink-0">{status}</Badge>;
    }
  }

  function getFilterLabel(key: string): string {
    const opt = FILTER_OPTIONS.find((o) => o.key === key);
    return opt?.label ?? key;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
            <Radio className="h-5 w-5 text-white" />
          </div>
          Broadcast SMS
        </h1>
        <p className="text-muted-foreground ml-[52px]">
          Send SMS messages to school owners and admins across the platform
        </p>
      </div>

      {/* Platform Gateway notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            Platform Hubtel Gateway
          </p>
          <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-0.5">
            Broadcasts are sent using the platform&apos;s master Hubtel credentials (
            <code className="font-mono">HUBTEL_CLIENT_ID</code> /{" "}
            <code className="font-mono">HUBTEL_CLIENT_SECRET</code>). Ensure
            these are configured in your environment.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Composer (left) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Audience Filter */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                Target Audience
              </CardTitle>
              <CardDescription>
                Filter which schools will receive this broadcast
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {FILTER_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const count = getStatForFilter(opt.key);
                  const isSelected = selectedFilter === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      id={`filter-${opt.key}`}
                      onClick={() => {
                        setSelectedFilter(opt.key);
                        setPreviewCount(null);
                      }}
                      className={cn(
                        "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-sm",
                        isSelected
                          ? `${opt.bgColor} ${opt.borderColor} ring-2 ring-offset-1 ring-indigo-500/30`
                          : "border-border hover:bg-muted/30"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 transition-colors",
                          isSelected ? opt.color : "text-muted-foreground"
                        )}
                      />
                      <div>
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {opt.description}
                        </p>
                        <p
                          className={cn(
                            "text-sm font-bold mt-1",
                            isSelected ? opt.color : "text-foreground"
                          )}
                        >
                          {count.toLocaleString()} org
                          {count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Preview count */}
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
                  <p className="text-sm text-muted-foreground">
                    ~{" "}
                    <span className="font-bold text-foreground">
                      {previewCount.toLocaleString()}
                    </span>{" "}
                    unique phone number{previewCount !== 1 ? "s" : ""} for &ldquo;
                    {getFilterLabel(selectedFilter)}&rdquo;
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message Composer */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                Compose Message
              </CardTitle>
              <CardDescription>
                This message will be sent to all owners and admins of the
                selected schools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                id="broadcast-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your broadcast message…"
                rows={5}
                className="resize-none text-base leading-relaxed"
                maxLength={MAX_SMS_CHARS * 3}
              />

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

              {/* Last result */}
              {lastResult && (
                <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-300">
                      Broadcast delivered to {lastResult.sent ?? 0} admin
                      {(lastResult.sent ?? 0) !== 1 ? "s" : ""}
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
                id="send-broadcast-btn"
                onClick={handleSend}
                disabled={isPending || charCount === 0}
                className="w-full gap-2 h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Broadcast…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Broadcast
                    {previewCount !== null && previewCount > 0 && (
                      <span className="ml-1 opacity-80">
                        ({previewCount.toLocaleString()} recipients)
                      </span>
                    )}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-1">
          <Card className="border shadow-sm h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Broadcast History
              </CardTitle>
              <CardDescription>Last 20 system broadcasts</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {recentLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
                  <Radio className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No broadcasts sent yet
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        {getStatusBadge(log.status)}
                        <Badge variant="outline" className="text-xs capitalize">
                          {getFilterLabel(log.targetFilter)}
                        </Badge>
                      </div>
                      <p className="text-sm line-clamp-2 leading-snug mt-1.5">
                        {log.message}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {log.recipientCount.toLocaleString()} recipient
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
