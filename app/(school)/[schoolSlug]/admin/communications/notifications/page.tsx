import { Metadata } from "next";
import { requireSchoolAccess } from "@/lib/auth/guards";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import prisma from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Notifications | School Management System",
  description: "View all your school notifications",
};

interface NotificationsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function NotificationsPage({
  params,
}: NotificationsPageProps) {
  const { schoolSlug } = await params;
  await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) return <div>School not found</div>;

  const notifications = await prisma.notification.findMany({
    where: { schoolId: school.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-bold flex items-center justify-between">
            <span>Recent Activity & Alerts</span>
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {unreadCount} unread
            </span>
          </CardTitle>
          <CardDescription>
            System alerts, notifications, and event updates for your school.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[550px]">
            <div className="divide-y divide-border/60">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500/40" />
                  <p className="font-medium">You're all caught up!</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    No new notifications found.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 flex gap-3.5 hover:bg-muted/30 transition-colors ${
                      !notification.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    <div
                      className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                        notification.isRead
                          ? "bg-transparent"
                          : "bg-primary animate-pulse"
                      }`}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">
                          {notification.title}
                        </h3>
                        <span className="text-[10px] flex items-center text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            { addSuffix: true }
                          )}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      {notification.link && (
                        <Link
                          href={
                            notification.link.startsWith("/")
                              ? `/${schoolSlug}${notification.link}`
                              : `/${schoolSlug}/${notification.link}`
                          }
                          className="text-xs text-primary font-semibold hover:underline inline-block mt-1.5"
                        >
                          View Details &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
