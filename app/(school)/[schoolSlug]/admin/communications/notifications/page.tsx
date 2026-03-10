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
import { Bell, CheckCircle2, Clock } from "lucide-react";
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

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with the latest events and alerts.
          </p>
        </div>
        <Bell className="w-8 h-8 text-primary/40" />
      </div>

      <Card className="border-none shadow-md bg-gradient-to-b from-background to-muted/20">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            You have {notifications.filter((n) => !n.isRead).length} unread
            notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="divide-y">
              {notifications.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-4 text-emerald-500/40" />
                  <p>You're all caught up! No notifications yet.</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 flex gap-4 hover:bg-muted/30 transition-colors ${!notification.isRead ? "bg-primary/5" : ""}`}
                  >
                    <div
                      className={`mt-1 h-3 w-3 rounded-full shrink-0 ${notification.isRead ? "bg-transparent" : "bg-primary animate-pulse"}`}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">
                          {notification.title}
                        </h3>
                        <span className="text-[10px] flex items-center text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            { addSuffix: true },
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      {notification.link && (
                        <Link
                          href={
                            notification.link.startsWith("/")
                              ? `/${schoolSlug}${notification.link}`
                              : `/${schoolSlug}/${notification.link}`
                          }
                          className="text-xs text-primary font-medium hover:underline inline-block mt-2"
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
