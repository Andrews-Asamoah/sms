"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Megaphone,
  Loader2,
  Plus,
  Calendar,
  User,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Search,
  Mail,
  MessageSquare,
  DollarSign,
  BadgeCheck,
  AlertCircle,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatDistanceToNow,
  formatDistanceToNowStrict,
  isPast,
} from "date-fns";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { AnnouncementDialog } from "./announcement-dialog";
import { FinancialMessageDialog } from "./financial-message-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  contentHtml?: string;
  target: string;
  targetName?: string;
  messageType: string;
  sendSms: boolean;
  sendEmail: boolean;
  smsCount: number;
  emailCount: number;
  createdAt: string;
  expiresAt: string | null;
  author: { name: string; image?: string };
  authorId?: string;
}

const TARGET_COLORS: Record<string, string> = {
  ALL: "bg-violet-500",
  TEACHER: "bg-blue-500",
  STUDENT: "bg-green-500",
  STAFF: "bg-orange-500",
  GUARDIAN: "bg-pink-500",
  ACCOUNTANT: "bg-yellow-500",
  CLASS: "bg-teal-500",
  CLUB: "bg-indigo-500",
};

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "ANNOUNCEMENT", label: "Announcements", isType: true },
  { key: "FINANCIAL", label: "Financial", isType: true },
];

export function AnnouncementsPageContent({
  canManage = false,
  canSendExternal = false,
  showFinancialMessage = false,
  initialAnnouncements = [],
}: {
  canManage?: boolean;
  canSendExternal?: boolean;
  showFinancialMessage?: boolean;
  initialAnnouncements?: Announcement[];
}) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [loading, setLoading] = useState(initialAnnouncements.length === 0);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [financialDialogOpen, setFinancialDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<
    string | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [now, setNow] = useState(new Date());

  // Force re-render every minute so that relative times update
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (
        activeFilter !== "all" &&
        !["ANNOUNCEMENT", "FINANCIAL"].includes(activeFilter)
      ) {
        params.set("filter", activeFilter);
      }
      if (["ANNOUNCEMENT", "FINANCIAL"].includes(activeFilter)) {
        params.set("messageType", activeFilter);
      }
      if (search) params.set("search", search);

      const res = await fetch(
        `/api/schools/${schoolSlug}/announcements?${params}`,
      );
      const data = await res.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current && initialAnnouncements.length > 0) {
      isMounted.current = true;
      return;
    }
    fetchAnnouncements();
  }, [schoolSlug, activeFilter]);

  // Debounced search
  useEffect(() => {
    if (!isMounted.current && initialAnnouncements.length > 0) return;
    const timer = setTimeout(() => fetchAnnouncements(), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async () => {
    if (!announcementToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/announcements/${announcementToDelete}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
      toast.success("Announcement deleted");
      fetchAnnouncements();
    } catch {
      toast.error("Failed to delete announcement");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setAnnouncementToDelete(null);
    }
  };

  const getTargetColor = (target: string) => {
    const key = target.split(":")[0];
    return TARGET_COLORS[key] || "bg-gray-500";
  };

  const activeCount = announcements.filter(
    (a) => !a.expiresAt || !isPast(new Date(a.expiresAt)),
  ).length;
  const expiredCount = announcements.filter(
    (a) => a.expiresAt && isPast(new Date(a.expiresAt)),
  ).length;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Announcements"
        description="Stay informed with the latest updates from your school."
      >
        <div className="flex items-center gap-2 flex-wrap">
          {showFinancialMessage && (
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              onClick={() => setFinancialDialogOpen(true)}
            >
              <Banknote className="mr-2 h-4 w-4" />
              Financial Message
            </Button>
          )}
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                setEditingAnnouncement(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
          )}
        </div>
      </DashboardPageHeader>

      {/* Stats bar */}
      {canManage && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Total",
              value: announcements.length,
              icon: Megaphone,
              color: "text-violet-600 dark:text-violet-400",
              bg: "bg-violet-50 dark:bg-violet-950/40",
            },
            {
              label: "Active",
              value: activeCount,
              icon: BadgeCheck,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 dark:bg-emerald-950/40",
            },
            {
              label: "Expired",
              value: expiredCount,
              icon: AlertCircle,
              color: "text-orange-600 dark:text-orange-400",
              bg: "bg-orange-50 dark:bg-orange-950/40",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "rounded-xl p-4 flex items-center gap-3 border",
                stat.bg,
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg bg-white/60 dark:bg-black/20",
                  stat.color,
                )}
              >
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={cn("text-xl font-bold", stat.color)}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setActiveFilter(opt.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                activeFilter === opt.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card animate-pulse h-52"
            />
          ))
        ) : announcements.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center h-64 rounded-xl border border-dashed bg-muted/20">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-base font-medium text-muted-foreground">
              No announcements found
            </p>
            <p className="text-sm text-muted-foreground/70">
              {search
                ? "Try a different search term"
                : "Check back later for updates."}
            </p>
          </div>
        ) : (
          announcements.map((announcement) => {
            const expiresAt = announcement.expiresAt
              ? new Date(announcement.expiresAt)
              : null;
            const hasExpired = expiresAt ? isPast(expiresAt) : false;
            const isFinancial = announcement.messageType === "FINANCIAL";
            const targetColor = getTargetColor(announcement.target);

            return (
              <div
                key={announcement.id}
                className={cn(
                  "group relative flex flex-col rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                  hasExpired && "opacity-60",
                  isFinancial && "border-emerald-200 dark:border-emerald-900",
                )}
              >
                {/* Color bar */}
                <div
                  className={cn(
                    "h-1 w-full",
                    isFinancial
                      ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                      : expiresAt && !hasExpired
                        ? "bg-gradient-to-r from-orange-400 to-red-500"
                        : "bg-gradient-to-r from-violet-400 to-indigo-500",
                  )}
                />

                <div className="p-4 flex-1 flex flex-col gap-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white",
                          targetColor,
                        )}
                      >
                        {isFinancial && <DollarSign className="h-2.5 w-2.5" />}
                        {announcement.targetName || announcement.target}
                      </span>
                      {isFinancial && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Financial
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {formatDistanceToNow(new Date(announcement.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingAnnouncement(announcement);
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                              onClick={() => {
                                setAnnouncementToDelete(announcement.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    className={cn(
                      "font-semibold text-sm leading-snug line-clamp-2",
                      hasExpired && "line-through text-muted-foreground",
                    )}
                  >
                    {announcement.title}
                  </h3>

                  {/* Content preview */}
                  {announcement.contentHtml ? (
                    <div
                      className="text-xs text-muted-foreground line-clamp-3 leading-relaxed prose-sm"
                      dangerouslySetInnerHTML={{
                        __html: announcement.contentHtml,
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="mt-auto pt-3 border-t flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {announcement.author.image ? (
                        <img
                          src={announcement.author.image}
                          className="h-5 w-5 rounded-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                        {announcement.author.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {announcement.smsCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400">
                          <MessageSquare className="h-2.5 w-2.5" />
                          {announcement.smsCount}
                        </span>
                      )}
                      {announcement.emailCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-indigo-600 dark:text-indigo-400">
                          <Mail className="h-2.5 w-2.5" />
                          {announcement.emailCount}
                        </span>
                      )}
                      {expiresAt && (
                        <span
                          className={cn(
                            "flex items-center gap-0.5 text-[10px] font-medium",
                            hasExpired
                              ? "text-muted-foreground"
                              : "text-orange-600 dark:text-orange-400",
                          )}
                        >
                          <Clock className="h-2.5 w-2.5" />
                          {hasExpired
                            ? "Expired"
                            : `Expires ${formatDistanceToNowStrict(expiresAt)}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dialogs */}
      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolSlug={schoolSlug as string}
        announcementToEdit={editingAnnouncement}
        onSuccess={fetchAnnouncements}
        canSendExternal={canSendExternal}
      />

      <FinancialMessageDialog
        open={financialDialogOpen}
        onOpenChange={setFinancialDialogOpen}
        schoolSlug={schoolSlug as string}
        onSuccess={fetchAnnouncements}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The announcement will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
