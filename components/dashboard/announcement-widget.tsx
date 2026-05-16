// components/dashboard/announcement-widget.tsx
"use client";

import { useState, useEffect } from "react";
import { Megaphone, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useParams } from "next/navigation";

interface Announcement {
  id: string;
  title: string;
  content: string;
  target: string;
  createdAt: string;
  author: {
    name: string;
  };
}

export function AnnouncementWidget() {
  const { schoolSlug } = useParams();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`/api/schools/${schoolSlug}/announcements`);
        if (!res.ok) {
          console.error(`Failed to fetch announcements: ${res.statusText}`);
          setAnnouncements([]);
          return;
        }
        const data = await res.json();
        setAnnouncements(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch announcements:", error);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [schoolSlug]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Announcements
          </CardTitle>
          <CardDescription>
            Stay updated with latest school news
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-[150px] items-center justify-center text-sm text-muted-foreground italic">
          No active announcements.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-2xl border-none bg-card/30 backdrop-blur-xl ring-1 ring-white/5 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Updates
          </CardTitle>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
            {announcements.length} NEW
          </Badge>
        </div>
        <CardDescription className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Important school news</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="group relative flex flex-col gap-2 p-4 rounded-2xl border bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                {announcement.title}
              </h4>
              <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter whitespace-nowrap bg-black/20 px-1.5 py-0.5 rounded-lg border border-white/5">
                {formatDistanceToNow(new Date(announcement.createdAt), {
                  addSuffix: false,
                })} ago
              </span>
            </div>
            <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
              {announcement.content}
            </p>
            <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/5 border-dashed">
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary border border-primary/10">
                  {announcement.author.name.charAt(0)}
                </div>
                <span className="text-[10px] font-bold text-muted-foreground/60">
                  {announcement.author.name}
                </span>
              </div>
              <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-black uppercase tracking-widest bg-white/10 text-muted-foreground">
                {announcement.target}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
