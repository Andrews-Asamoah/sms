// components/shared/notification-bell.tsx
"use client";

import { Bell, Wifi, WifiOff } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useNotifications } from "@/lib/notifications-context";

export function NotificationBell() {
  const { schoolSlug } = useParams();
  const { notifications, unreadCount, isConnected, markRead, markAllRead } =
    useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg hover:bg-accent/80 transition-all duration-200"
        >
          <Bell className="h-[1.2rem] w-[1.2rem] transition-all" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-white border-2 border-background animate-in zoom-in"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground bg-secondary px-2 rounded-full">
                {unreadCount} unread
              </span>
            )}
            {/* Live connection indicator */}
            <span
              title={isConnected ? "Live updates active" : "Reconnecting…"}
              className="ml-1"
            >
              {isConnected ? (
                <Wifi className="h-3 w-3 text-emerald-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-muted-foreground animate-pulse" />
              )}
            </span>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 text-primary hover:bg-primary/10"
              onClick={markAllRead}
            >
              Clear All
            </Button>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex flex-col gap-1 p-4 border-b last:border-0 hover:bg-accent/50 transition-colors cursor-pointer",
                    !notification.isRead && "bg-accent/30",
                  )}
                  onClick={() =>
                    !notification.isRead && markRead(notification.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {notification.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  {notification.link && (
                    <Link
                      href={
                        notification.link.startsWith(`/${schoolSlug}`)
                          ? notification.link
                          : `/${schoolSlug}${notification.link.startsWith("/") ? "" : "/"}${notification.link}`
                      }
                      className="text-[10px] text-primary hover:underline mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!notification.isRead) {
                          markRead(notification.id);
                        }
                      }}
                    >
                      View details
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t text-center">
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <Link href={`/${schoolSlug}/notifications`}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
