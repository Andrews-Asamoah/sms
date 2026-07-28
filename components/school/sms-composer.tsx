// components/school/sms-composer.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
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
  User,
  Search,
  Phone,
  X,
  UserPlus,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  sendSchoolSMS,
  sendSingleSchoolSMS,
  searchSchoolRecipients,
  previewSMSRecipientCount,
  type SMSAudienceType,
  type SingleRecipientOption,
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
  // Sending mode: "bulk" | "single"
  const [sendMode, setSendMode] = useState<"bulk" | "single">("bulk");

  // Shared state
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [logs] = useState<SMSLog[]>(initialLogs);
  const [lastResult, setLastResult] = useState<{
    sent?: number;
    failed?: number;
    batchId?: string;
    recipientName?: string;
  } | null>(null);

  // Bulk mode state
  const [selectedAudiences, setSelectedAudiences] = useState<SMSAudienceType[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Single recipient mode state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SingleRecipientOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSingleRecipient, setSelectedSingleRecipient] =
    useState<SingleRecipientOption | null>(null);
  const [customPhone, setCustomPhone] = useState("");
  const [customName, setCustomName] = useState("");
  const [useCustomEntry, setUseCustomEntry] = useState(false);

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / MAX_SMS_CHARS) || 1;
  const charsRemaining = MAX_SMS_CHARS * smsCount - charCount;

  // Search recipients for single SMS mode
  useEffect(() => {
    if (sendMode !== "single" || useCustomEntry) return;
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchSchoolRecipients(schoolId, searchQuery);
        if (res.success) {
          setSearchResults(res.data);
        }
      } catch {
        console.error("Recipient search failed");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, schoolId, sendMode, useCustomEntry]);

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

  // Handle Bulk SMS Send
  function handleSendBulk() {
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
            `✅ Bulk SMS sent to ${result.sent ?? result.recipientCount} recipient${(result.sent ?? 0) !== 1 ? "s" : ""}${
              result.failed && result.failed > 0
                ? ` (${result.failed} failed)`
                : ""
            }`
          );
          setMessage("");
          setSelectedAudiences([]);
          setPreviewCount(null);
        } else {
          toast.error(result.error || "Failed to send SMS");
        }
      } catch {
        toast.error("An unexpected error occurred");
      }
    });
  }

  // Handle Single SMS Send
  function handleSendSingle() {
    if (message.trim().length === 0) {
      toast.error("Please type a message before sending");
      return;
    }

    let targetPhone = "";
    let targetName = "";
    let targetRole = "Custom";

    if (useCustomEntry) {
      if (!customPhone.trim()) {
        toast.error("Please enter a valid phone number");
        return;
      }
      targetPhone = customPhone.trim();
      targetName = customName.trim() || targetPhone;
      targetRole = "Custom";
    } else {
      if (!selectedSingleRecipient) {
        toast.error("Please select a parent, teacher, or staff member");
        return;
      }
      targetPhone = selectedSingleRecipient.phone;
      targetName = selectedSingleRecipient.name;
      targetRole = selectedSingleRecipient.role;
    }

    startTransition(async () => {
      try {
        const result = await sendSingleSchoolSMS({
          schoolId,
          schoolSlug,
          recipientName: targetName,
          recipientPhone: targetPhone,
          recipientRole: targetRole,
          message: message.trim(),
        });

        if (result.success) {
          setLastResult({
            sent: 1,
            failed: 0,
            batchId: result.batchId,
            recipientName: targetName,
          });
          toast.success(`✅ Message sent directly to ${targetName} (${targetPhone})`);
          setMessage("");
          setSelectedSingleRecipient(null);
          setSearchQuery("");
          setCustomPhone("");
          setCustomName("");
        } else {
          toast.error(result.error || "Failed to send single SMS");
        }
      } catch {
        toast.error("An unexpected error occurred");
      }
    });
  }

  function formatAudienceType(audienceType: string): string {
    if (audienceType.startsWith("single:")) {
      const parts = audienceType.split(":");
      const role = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "Single";
      const name = parts[2] || "";
      return `Single (${role}${name ? `: ${name}` : ""})`;
    }
    return audienceType.charAt(0).toUpperCase() + audienceType.slice(1);
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

  const totalSelected = selectedAudiences.reduce(
    (acc, key) => acc + getAudienceCount(key),
    0
  );

  return (
    <div className="space-y-6">
      {/* Custom SMS Gateway Status Bar */}
      <div className="flex items-center justify-between gap-4 bg-muted/30 p-3.5 rounded-xl border border-border/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <MessageSquare className="h-4 w-4 text-blue-500 shrink-0" />
          <span>SMS Gateway for {schoolName}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasCustomSMS ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 px-2.5 py-0.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Custom Gateway: {customSenderId || "Configured"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
              <Info className="h-3.5 w-3.5" /> Default Gateway
            </Badge>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <Tabs
        value={sendMode}
        onValueChange={(val) => {
          setSendMode(val as "bulk" | "single");
          setLastResult(null);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md h-auto sm:h-11 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger
            value="bulk"
            className="rounded-lg gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold py-2 sm:py-0 data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
          >
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 shrink-0" />
            <span className="truncate">Bulk Broadcast</span>
          </TabsTrigger>
          <TabsTrigger
            value="single"
            className="rounded-lg gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold py-2 sm:py-0 data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
          >
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500 shrink-0" />
            <span className="truncate">Single Recipient</span>
          </TabsTrigger>
        </TabsList>

        <div className="grid gap-6 lg:grid-cols-3 mt-6">
          {/* Main Form (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* BULK MODE CONTENT */}
            <TabsContent value="bulk" className="m-0 space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Select Target Audience
                  </CardTitle>
                  <CardDescription>
                    Choose which groups will receive this broadcast
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {AUDIENCE_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const count = getAudienceCount(opt.key);
                      const checked = selectedAudiences.includes(opt.key);
                      return (
                        <div
                          key={opt.key}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleAudience(opt.key)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleAudience(opt.key);
                            }
                          }}
                          className={cn(
                            "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left cursor-pointer transition-all duration-200 hover:bg-muted/50 select-none",
                            checked
                              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                              : "border-border"
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <Icon className={cn("h-5 w-5", opt.color)} />
                            <div
                              className={cn(
                                "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                                checked
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-input bg-background"
                              )}
                            >
                              {checked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{opt.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {count.toLocaleString()} recipient
                              {count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

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
            </TabsContent>

            {/* SINGLE RECIPIENT MODE CONTENT */}
            <TabsContent value="single" className="m-0 space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-500" />
                      Select Single Recipient
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUseCustomEntry(!useCustomEntry);
                        setSelectedSingleRecipient(null);
                        setSearchQuery("");
                      }}
                      className="text-xs text-purple-600 dark:text-purple-400 gap-1 h-7"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {useCustomEntry
                        ? "Search Parent/Staff Directory"
                        : "Enter Manual Phone Number"}
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    {useCustomEntry
                      ? "Enter a phone number directly for a one-off SMS"
                      : "Search for a parent/guardian, teacher, or staff member in your school"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {useCustomEntry ? (
                    /* Manual Entry Form */
                    <div className="grid gap-3 sm:grid-cols-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Mobile Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="024XXXXXXX or 233XXXXXXXXX"
                            value={customPhone}
                            onChange={(e) => setCustomPhone(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Recipient Name (Optional)
                        </label>
                        <Input
                          placeholder="e.g. Mr. John Mensah"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Directory Search */
                    <div className="space-y-3">
                      {selectedSingleRecipient ? (
                        /* Selected Recipient Card */
                        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-purple-500 bg-purple-50/50 dark:bg-purple-950/30">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                              {selectedSingleRecipient.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">
                                  {selectedSingleRecipient.name}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {selectedSingleRecipient.role}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Phone:{" "}
                                <span className="font-mono text-foreground font-semibold">
                                  {selectedSingleRecipient.phone}
                                </span>
                                {selectedSingleRecipient.detail && (
                                  <span className="ml-2">• {selectedSingleRecipient.detail}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedSingleRecipient(null)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        /* Search Box & Dropdown */
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by name, phone, or parent details…"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9 pr-9"
                            />
                            {isSearching && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>

                          {/* Results List */}
                          {searchQuery.trim().length >= 2 && (
                            <div className="mt-2 rounded-xl border border-border bg-card shadow-lg max-h-60 overflow-y-auto divide-y">
                              {searchResults.length === 0 && !isSearching ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  No parent or staff found matching &ldquo;{searchQuery}&rdquo;.
                                </div>
                              ) : (
                                searchResults.map((item) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSingleRecipient(item);
                                      setSearchQuery("");
                                    }}
                                    className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3"
                                  >
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">
                                          {item.name}
                                        </span>
                                        <Badge
                                          variant="secondary"
                                          className="text-[11px] px-1.5 py-0"
                                        >
                                          {item.role}
                                        </Badge>
                                      </div>
                                      {item.detail && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {item.detail}
                                        </p>
                                      )}
                                    </div>
                                    <span className="font-mono text-xs text-muted-foreground shrink-0">
                                      {item.phone}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* MESSAGE COMPOSER CARD (Used by both Bulk and Single modes) */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Message Content
                </CardTitle>
                <CardDescription>
                  Compose your SMS message. Keep it concise and professional.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  id="sms-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here…"
                  rows={5}
                  className="resize-none pr-2 text-base leading-relaxed"
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

                {/* Last send result alert */}
                {lastResult && (
                  <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50 p-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-300">
                        {lastResult.recipientName ? (
                          <>Sent to {lastResult.recipientName}</>
                        ) : (
                          <>
                            Bulk send: {lastResult.sent ?? 0} delivered
                            {lastResult.failed ? `, ${lastResult.failed} failed` : ""}
                          </>
                        )}
                      </p>
                      {lastResult.batchId && (
                        <p className="text-xs text-green-700/70 dark:text-green-400/70 font-mono mt-0.5">
                          Batch ID: {lastResult.batchId}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Send Button */}
                {sendMode === "bulk" ? (
                  <Button
                    id="send-sms-btn"
                    onClick={handleSendBulk}
                    disabled={
                      isPending ||
                      charCount === 0 ||
                      selectedAudiences.length === 0
                    }
                    className="w-full gap-2 h-11 text-base font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending Bulk Broadcast…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Bulk Broadcast
                        {selectedAudiences.length > 0 && totalSelected > 0 && (
                          <span className="ml-1 opacity-80">
                            (~{(previewCount ?? totalSelected).toLocaleString()}{" "}
                            recipients)
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    id="send-single-sms-btn"
                    onClick={handleSendSingle}
                    disabled={
                      isPending ||
                      charCount === 0 ||
                      (!selectedSingleRecipient && !customPhone.trim())
                    }
                    className="w-full gap-2 h-11 text-base font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending Message…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Message to{" "}
                        {useCustomEntry
                          ? customName || customPhone || "Recipient"
                          : selectedSingleRecipient?.name || "Recipient"}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — SMS History (Right 1 col) */}
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
                          <span className="text-xs text-muted-foreground font-medium truncate max-w-[140px]">
                            {formatAudienceType(log.audienceType)}
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
      </Tabs>
    </div>
  );
}
