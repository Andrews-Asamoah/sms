"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import {
  MessageSquare,
  Mail,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Phone,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  UnifiedCommItem,
  CommChannel,
  CommStatus,
  CommunicationHistoryFilters,
} from "@/lib/types/communications";

// Use the shared type alias
type Filters = CommunicationHistoryFilters;

interface CommunicationHistoryClientProps {
  schoolSlug: string;
  initialData: UnifiedCommItem[];
  totalCount: number;
  initialFilters: Filters;
  pageSize: number;
}

export function CommunicationHistoryClient({
  schoolSlug,
  initialData,
  totalCount,
  initialFilters,
  pageSize,
}: CommunicationHistoryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [search, setSearch] = useState(initialFilters.search);
  const [previewItem, setPreviewItem] = useState<UnifiedCommItem | null>(null);

  // Push new URL to trigger server-side re-fetch
  const applyFilters = useCallback(
    (newFilters: Partial<Filters>) => {
      const merged = { ...filters, ...newFilters, page: newFilters.page ?? 1 };
      setFilters(merged);

      const qs = new URLSearchParams();
      if (merged.channel && merged.channel !== "ALL") qs.set("channel", merged.channel);
      if (merged.status && merged.status !== "ALL") qs.set("status", merged.status);
      if (merged.search) qs.set("search", merged.search);
      if (merged.page > 1) qs.set("page", String(merged.page));

      startTransition(() => {
        router.push(`${pathname}?${qs.toString()}`, { scroll: false });
      });
    },
    [filters, pathname, router]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const isEmpty = initialData.length === 0;

  return (
    <div className="space-y-6">
      {/* ── Filter & Search Toolbar ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-muted/30 p-3 rounded-xl border border-border/60">
        <div className="flex flex-wrap gap-2.5 items-center flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipient, subject, message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters({ search });
              }}
              onBlur={() => {
                if (search !== filters.search) applyFilters({ search });
              }}
              className="pl-9 h-9 text-xs md:text-sm"
            />
          </div>

          {/* Channel */}
          <Select
            value={filters.channel}
            onValueChange={(v) => applyFilters({ channel: v as CommChannel })}
          >
            <SelectTrigger className="w-36 h-9 text-xs md:text-sm gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Channels</SelectItem>
              <SelectItem value="SMS">SMS Only</SelectItem>
              <SelectItem value="EMAIL">Email Only</SelectItem>
            </SelectContent>
          </Select>

          {/* Status */}
          <Select
            value={filters.status}
            onValueChange={(v) => applyFilters({ status: v as CommStatus })}
          >
            <SelectTrigger className="w-32 h-9 text-xs md:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear */}
          {(filters.channel !== "ALL" ||
            filters.status !== "ALL" ||
            filters.search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                applyFilters({ channel: "ALL", status: "ALL", search: "", page: 1 });
              }}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>

        <Badge variant="outline" className="self-end sm:self-center text-xs font-semibold px-2.5 py-1 text-muted-foreground whitespace-nowrap shrink-0">
          {totalCount.toLocaleString()} Total Records
        </Badge>
      </div>

      {/* ── Records Table ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 items-center bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
          <span>Channel</span>
          <span>Recipient</span>
          <span>Subject / Message</span>
          <span>Category</span>
          <span>Status</span>
          <span>Sent</span>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-6">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold text-base">No records found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filters.search || filters.channel !== "ALL" || filters.status !== "ALL"
                  ? "Try adjusting your filters or search term."
                  : "Communications you send will appear here for your records."}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {initialData.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-3 md:gap-4 items-start md:items-center px-4 py-4 hover:bg-muted/30 transition-colors group"
              >
                {/* Channel Badge */}
                <div>
                  <ChannelBadge channel={item.channel} />
                </div>

                {/* Recipient */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {item.channel === "SMS" ? (
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-mono text-sm font-medium truncate">
                      {item.recipient}
                    </span>
                  </div>
                  {item.recipientName && (
                    <p className="text-xs text-muted-foreground mt-0.5 pl-5">
                      {item.recipientName}
                    </p>
                  )}
                  {item.channel === "SMS" && item.failedCount != null && item.failedCount > 0 && (
                    <p className="text-xs text-red-500 mt-0.5 pl-5 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      {item.failedCount} failed
                    </p>
                  )}
                </div>

                {/* Subject / Message */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{item.subjectOrTitle}</p>
                  {item.messagePreview !== item.subjectOrTitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {item.messagePreview}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <CategoryBadge category={item.category} />
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={item.status} />
                </div>

                {/* Timestamp + View */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {format(new Date(item.createdAt), "MMM d, yyyy · h:mma")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => setPreviewItem(item)}
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {filters.page} of {totalPages} ·{" "}
            {totalCount.toLocaleString()} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => applyFilters({ page: filters.page - 1 })}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page >= totalPages}
              onClick={() => applyFilters({ page: filters.page + 1 })}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail Preview Dialog ────────────────────────────────────────── */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewItem && <ChannelBadge channel={previewItem.channel} />}
              Message Details
            </DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <DetailRow label="Channel" value={previewItem.channel} />
                <DetailRow label="Status">
                  <StatusBadge status={previewItem.status} />
                </DetailRow>
                <DetailRow
                  label="Recipient"
                  value={
                    previewItem.recipientName
                      ? `${previewItem.recipientName} (${previewItem.recipient})`
                      : previewItem.recipient
                  }
                />
                <DetailRow label="Category">
                  <CategoryBadge category={previewItem.category} />
                </DetailRow>
                {previewItem.batchId && (
                  <DetailRow
                    label="Batch ID"
                    value={
                      <span className="font-mono text-xs">{previewItem.batchId}</span>
                    }
                  />
                )}
                {previewItem.failedCount != null && previewItem.failedCount > 0 && (
                  <DetailRow
                    label="Failed"
                    value={<span className="text-red-500 font-semibold">{previewItem.failedCount}</span>}
                  />
                )}
                <DetailRow
                  label="Sent"
                  value={format(new Date(previewItem.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  {previewItem.channel === "SMS" ? "Message Body" : "Subject"}
                </p>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {previewItem.messagePreview}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: "SMS" | "EMAIL" }) {
  if (channel === "SMS") {
    return (
      <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 gap-1.5 font-semibold shrink-0">
        <MessageSquare className="h-3 w-3" />
        SMS
      </Badge>
    );
  }
  return (
    <Badge className="bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 gap-1.5 font-semibold shrink-0">
      <Mail className="h-3 w-3" />
      Email
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "SENT") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1 shrink-0">
        <CheckCircle2 className="h-3 w-3" />
        Sent
      </Badge>
    );
  }
  if (status === "PARTIAL") {
    return (
      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 gap-1 shrink-0">
        <AlertTriangle className="h-3 w-3" />
        Partial
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 gap-1 shrink-0">
      <XCircle className="h-3 w-3" />
      Failed
    </Badge>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  ANNOUNCEMENT: "Announcement",
  FEE_REMINDER: "Fee Reminder",
  INVITATION: "Invitation",
  GRADEBOOK: "Gradebook",
  SYSTEM: "System",
  GENERAL: "General",
  DIRECT: "Direct",
  "Guardians / Parents": "Guardians",
  Teachers: "Teachers",
  Staff: "Staff",
  Everyone: "Everyone",
};

function CategoryBadge({ category }: { category: string }) {
  const label = CATEGORY_LABELS[category] ?? category;
  return (
    <Badge variant="outline" className="text-xs font-normal shrink-0 max-w-[120px] truncate">
      {label}
    </Badge>
  );
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <div className="text-sm font-semibold">{children ?? value}</div>
    </div>
  );
}
