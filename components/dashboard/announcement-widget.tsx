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
        const data = await res.json();
        setAnnouncements(data);
      } catch (error) {
        console.error("Failed to fetch announcements:", error);
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
    <Card className="shadow-md border-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Announcements
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {announcements.length} New
          </Badge>
        </div>
        <CardDescription>Important updates for you</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="group relative flex flex-col gap-1 p-3 rounded-lg border bg-accent/5 hover:bg-accent/10 transition-all"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{announcement.title}</h4>
              <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                {formatDistanceToNow(new Date(announcement.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {announcement.content}
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
              <span className="text-[10px] text-muted-foreground italic">
                By {announcement.author.name}
              </span>
              <Badge variant="secondary" className="text-[9px] h-4">
                {announcement.target}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
