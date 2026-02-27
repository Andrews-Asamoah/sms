"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Circle,
  Trash2,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Info,
  CalendarCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
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

export function NotificationsPageContent() {
  const { schoolSlug } = useParams();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/notifications`);
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [schoolSlug]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/schools/${schoolSlug}/notifications`, {
        method: "PATCH",
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await fetch(`/api/schools/${schoolSlug}/notifications`, {
        method: "PUT", // Assuming we implement a PUT for mark all read
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to update notifications");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "ATTENDANCE":
        return <CalendarCheck className="h-5 w-5 text-blue-500" />;
      case "ANNOUNCEMENT":
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case "SYSTEM":
        return <Info className="h-5 w-5 text-orange-500" />;
      case "ERROR":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Notifications"
        description="Stay updated with the latest alerts and news from your school."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={
              loading || markingAllRead || notifications.every((n) => n.isRead)
            }
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </DashboardPageHeader>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : notifications.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-64 py-12">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-medium text-muted-foreground">
                No notifications yet
              </p>
              <p className="text-sm text-muted-foreground">
                We'll let you know when something important happens.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  !notification.isRead &&
                    "border-l-4 border-l-primary bg-primary/5 shadow-sm",
                )}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="mt-1 shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4
                        className={cn(
                          "text-sm font-semibold",
                          !notification.isRead && "text-primary font-bold",
                        )}
                      >
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            { addSuffix: true },
                          )}
                        </span>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Circle className="h-3 w-3 fill-primary text-primary" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {notification.message}
                    </p>
                    {notification.link && (
                      <Button
                        variant="link"
                        className="p-0 h-auto text-xs text-primary font-medium"
                        asChild
                      >
                        <Link href={notification.link}>
                          <ExternalLink className="mr-1 h-3 w-3" />
                          View Details
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
