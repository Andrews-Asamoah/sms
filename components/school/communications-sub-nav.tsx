"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Send,
  Megaphone,
  History,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommunicationsSubNavProps {
  schoolSlug: string;
}

const NAV_ITEMS = [
  { label: "Overview", path: "", icon: LayoutDashboard, exact: true },
  { label: "Send SMS", path: "/messages", icon: Send, exact: false },
  { label: "Announcements", path: "/announcements", icon: Megaphone, exact: false },
  { label: "Sent History", path: "/history", icon: History, exact: false },
  { label: "Notifications", path: "/notifications", icon: Bell, exact: false },
];

export function CommunicationsSubNav({ schoolSlug }: CommunicationsSubNavProps) {
  const pathname = usePathname();
  const base = `/${schoolSlug}/admin/communications`;

  return (
    <div className="flex flex-col gap-4 pb-2 border-b border-border/60">
      {/* Header Banner */}
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner shrink-0">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Communication Center
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Broadcast SMS, send announcements, view audit history, and monitor alerts.
          </p>
        </div>
      </div>

      {/* Modern Responsive Segmented Tabs */}
      <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none snap-x touch-pan-x">
        {NAV_ITEMS.map((item) => {
          const href = `${base}${item.path}`;
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === href
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 snap-start select-none",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
