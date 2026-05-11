"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Bell, CheckCircle2, Circle, ExternalLink, MessageSquare, AlertTriangle,
  Info, CalendarCheck, DollarSign, Megaphone, Loader2, BellOff, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DashboardPageHeader } from "@/components/layout/page-header";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  ATTENDANCE_ALERT:  { icon: CalendarCheck, color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-100 dark:bg-blue-950",    label: "Attendance"   },
  ANNOUNCEMENT:      { icon: Megaphone,     color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-950", label: "Announcement" },
  FINANCIAL_MESSAGE: { icon: DollarSign,    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950", label: "Financial" },
  FEE_REMINDER:      { icon: DollarSign,    color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-950", label: "Fee Reminder" },
  RESULT_PUBLISHED:  { icon: CheckCircle2,  color: "text-green-600 dark:text-green-400",  bg: "bg-green-100 dark:bg-green-950",  label: "Results"      },
  ONLINE_PAYMENT:    { icon: DollarSign,    color: "text-teal-600 dark:text-teal-400",    bg: "bg-teal-100 dark:bg-teal-950",    label: "Payment"      },
  GENERAL:           { icon: Info,          color: "text-slate-600 dark:text-slate-400",  bg: "bg-slate-100 dark:bg-slate-800",  label: "General"      },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "FINANCIAL_MESSAGE", label: "Financial" },
  { key: "ANNOUNCEMENT", label: "Announcements" },
  { key: "ATTENDANCE_ALERT", label: "Attendance" },
];

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const groups = new Map<string, Notification[]>();
  notifications.forEach((n) => {
    const d = new Date(n.createdAt);
    const key = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEE, d MMM yyyy");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  });
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export function NotificationsPageContent() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/notifications`);
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [schoolSlug]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/schools/${schoolSlug}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch { /* silent */ }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await fetch(`/api/schools/${schoolSlug}/notifications`, { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to update notifications");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const filtered = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !n.isRead;
    return n.type === activeFilter;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups = groupByDate(filtered);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Notifications"
        description="Stay updated with the latest alerts and news."
      >
        <Button
          variant="outline" size="sm"
          onClick={markAllAsRead}
          disabled={loading || markingAllRead || unreadCount === 0}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Mark all read
        </Button>
      </DashboardPageHeader>

      {/* Stats bar */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: notifications.length, color: "text-foreground" },
            { label: "Unread", value: unreadCount, color: "text-primary font-bold" },
            { label: "Today", value: notifications.filter((n) => isToday(new Date(n.createdAt))).length, color: "text-emerald-600 dark:text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-3 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
              activeFilter === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {tab.label}
            {tab.key === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed bg-muted/20">
          <BellOff className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-base font-medium text-muted-foreground">
            {activeFilter === "unread" ? "All caught up!" : "No notifications"}
          </p>
          <p className="text-sm text-muted-foreground/70">
            {activeFilter === "unread" ? "You have no unread notifications." : "We'll notify you when something happens."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ label, items }) => (
            <div key={label}>
              {/* Date group header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="space-y-2">
                {items.map((notification, idx) => {
                  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.GENERAL;
                  const Icon = config.icon;

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "group flex items-start gap-3 p-4 rounded-xl border transition-all duration-200",
                        !notification.isRead
                          ? "bg-primary/5 border-primary/20 shadow-sm"
                          : "bg-card hover:bg-muted/30",
                      )}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      {/* Icon */}
                      <div className={cn("mt-0.5 shrink-0 h-9 w-9 rounded-full flex items-center justify-center", config.bg)}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <h4 className={cn("text-sm leading-tight truncate", !notification.isRead && "font-semibold text-primary")}>
                              {notification.title}
                            </h4>
                            <Badge variant="outline" className="text-[10px] shrink-0 py-0">{config.label}</Badge>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                            {!notification.isRead && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="h-5 w-5 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center transition-colors"
                                title="Mark as read"
                              >
                                <Circle className="h-2 w-2 fill-primary text-primary" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {notification.message}
                        </p>

                        {notification.link && (
                          <Button variant="link" className="p-0 h-auto text-xs font-medium text-primary" asChild>
                            <Link href={notification.link.startsWith(`/${schoolSlug}`) ? notification.link : `/${schoolSlug}${notification.link.startsWith("/") ? "" : "/"}${notification.link}`}>
                              <ExternalLink className="mr-1 h-3 w-3" />
                              View Details
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
