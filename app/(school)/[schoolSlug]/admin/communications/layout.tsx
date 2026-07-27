// app/(school)/[schoolSlug]/admin/communications/layout.tsx
"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  MessageSquare,
  Send,
  Megaphone,
  History,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommunicationsLayoutProps {
  children: React.ReactNode;
}

export default function CommunicationsLayout({
  children,
}: CommunicationsLayoutProps) {
  const pathname = usePathname();
  const params = useParams();
  const schoolSlug = (params?.schoolSlug as string) || "";

  const navItems = [
    {
      label: "Overview",
      href: `/${schoolSlug}/admin/communications`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Send SMS",
      href: `/${schoolSlug}/admin/communications/messages`,
      icon: Send,
      exact: false,
    },
    {
      label: "Announcements",
      href: `/${schoolSlug}/admin/communications/announcements`,
      icon: Megaphone,
      exact: false,
    },
    {
      label: "Sent History",
      href: `/${schoolSlug}/admin/communications/history`,
      icon: History,
      exact: false,
    },
    {
      label: "Notifications",
      href: `/${schoolSlug}/admin/communications/notifications`,
      icon: Bell,
      exact: false,
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Top Section Header */}
      <div className="flex flex-col gap-2 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Communication Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage SMS broadcasts, announcements, email logs, and school notifications
            </p>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <nav className="flex items-center gap-1 overflow-x-auto pt-3 pb-1 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content View */}
      <div>{children}</div>
    </div>
  );
}
