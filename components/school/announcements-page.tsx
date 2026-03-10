"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatDistanceToNow,
  formatDistanceToNowStrict,
  isPast,
} from "date-fns";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { useUser } from "@/lib/auth-client";
import { AnnouncementDialog } from "./announcement-dialog";
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
  target: string;
  targetName?: string;
  createdAt: string;
  expiresAt: string | null;
  author: {
    name: string;
  };
  authorId?: string; // Assume API returns this if needed for ownership logic, or we use isAdmin
}

export function AnnouncementsPageContent({
  canManage = false,
}: {
  canManage?: boolean;
}) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);

  // Alert Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<
    string | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Timer tick for dynamic countdowns
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Update 'now' every 10 seconds to keep countdowns fresh without spamming re-renders
    const interval = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${schoolSlug}/announcements`);
      const data = await res.json();
      setAnnouncements(data);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [schoolSlug]);

  const handleDelete = async () => {
    if (!announcementToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/announcements/${announcementToDelete}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Failed to delete announcement");
      toast.success("Announcement deleted successfully");
      fetchAnnouncements();
    } catch (error) {
      toast.error("An error occurred while deleting");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setAnnouncementToDelete(null);
    }
  };

  const handleEditClick = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setDialogOpen(true);
  };

  const handleCreateClick = () => {
    setEditingAnnouncement(null);
    setDialogOpen(true);
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Announcements"
        description="Stay informed with the latest updates from your school."
      >
        <div className="flex items-center gap-2">
          {canManage && (
            <Button size="sm" onClick={handleCreateClick}>
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
          )}
        </div>
      </DashboardPageHeader>

      <div className="grid gap-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : announcements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-64 py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-medium text-muted-foreground">
                No announcements yet
              </p>
              <p className="text-sm text-muted-foreground italic">
                Check back later for important updates.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {announcements.map((announcement) => {
              // Calculate countdown
              const expiresAt = announcement.expiresAt
                ? new Date(announcement.expiresAt)
                : null;
              const hasExpired = expiresAt ? isPast(expiresAt) : false;

              return (
                <Card
                  key={announcement.id}
                  className={cn(
                    "flex flex-col hover:shadow-md transition-shadow relative overflow-hidden",
                    hasExpired && "opacity-70 grayscale-[0.3]",
                  )}
                >
                  {/* Visual indicator for time-sensitive active announcements */}
                  {expiresAt && !hasExpired && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-500" />
                  )}

                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge
                        variant={hasExpired ? "secondary" : "outline"}
                        className="text-[10px] pointer-events-none"
                      >
                        {announcement.targetName || announcement.target}
                      </Badge>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(
                            new Date(announcement.createdAt),
                            {
                              addSuffix: true,
                            },
                          )}
                        </span>

                        {/* Dropdown Menu for Admin/Owner */}
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 -mr-2"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditClick(announcement)}
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
                    <CardTitle
                      className={cn(
                        "text-lg leading-tight line-clamp-2",
                        hasExpired &&
                          "line-through decoration-muted-foreground/50",
                      )}
                    >
                      {announcement.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4 leading-relaxed">
                      {announcement.content}
                    </p>
                  </CardContent>

                  <CardFooter className="pt-4 border-t w-full flex-col items-start gap-2 text-[11px] text-muted-foreground bg-muted/20">
                    <div className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {announcement.author.name}
                      </span>

                      {expiresAt && (
                        <span
                          className={cn(
                            "flex items-center gap-1 font-medium",
                            hasExpired
                              ? "text-muted-foreground"
                              : "text-orange-600 dark:text-orange-400",
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {hasExpired
                            ? "Expired"
                            : `Expires in ${formatDistanceToNowStrict(expiresAt)}`}
                        </span>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolSlug={schoolSlug as string}
        announcementToEdit={editingAnnouncement}
        onSuccess={fetchAnnouncements}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              announcement and remove it from our servers.
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
