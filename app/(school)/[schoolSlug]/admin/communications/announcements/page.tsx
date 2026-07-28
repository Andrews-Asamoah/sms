import { Metadata } from "next";
import { requireSchoolAccess } from "@/lib/auth/guards";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { Megaphone, Plus, Calendar, User, Mail, MessageSquare, Tag } from "lucide-react";

export const metadata: Metadata = {
  title: "Announcements | School Management System",
  description: "Manage school-wide announcements and updates",
};

interface AnnouncementsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AnnouncementsPage({
  params,
}: AnnouncementsPageProps) {
  const { schoolSlug } = await params;
  await requireSchoolAccess(schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) return <div>School not found</div>;

  const announcements = await prisma.announcement.findMany({
    where: { schoolId: school.id },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
    },
  });

  function formatTargetLabel(target: string) {
    if (target === "ALL") return "Everyone";
    if (target.startsWith("CLASS:")) return `Class ${target.split(":")[1]}`;
    if (target.startsWith("CLUB:")) return `Club ${target.split(":")[1]}`;
    return target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/30 p-4 rounded-xl border border-border/60">
        <div>
          <h2 className="text-base font-bold">School Announcements</h2>
          <p className="text-xs text-muted-foreground">
            Broadcast messages to students, teachers, and parents.
          </p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-sm shrink-0 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1.5" /> New Announcement
        </Button>
      </div>

      {/* Announcements List */}
      <div className="grid gap-4 min-w-0">
        {announcements.length === 0 ? (
          <Card className="border-dashed min-h-[250px] flex items-center justify-center text-center">
            <div className="space-y-3 p-6 max-w-md mx-auto">
              <Megaphone className="w-10 h-10 text-muted-foreground mx-auto opacity-25" />
              <div>
                <h3 className="text-base font-semibold text-muted-foreground">
                  No Announcements Yet
                </h3>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Start communicating with your school community today.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow min-w-0"
            >
              <CardHeader className="pb-3 space-y-2.5">
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-primary/20 gap-1 text-[10px] font-bold uppercase tracking-wider shrink-0">
                      <Megaphone className="w-3 h-3" />
                      {announcement.messageType || "Announcement"}
                    </Badge>

                    <Badge variant="outline" className="gap-1 text-[11px] font-medium shrink-0">
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      Audience: {formatTargetLabel(announcement.target)}
                    </Badge>

                    {announcement.sendEmail && (
                      <Badge variant="secondary" className="gap-1 text-[10px] shrink-0 text-violet-700 dark:text-violet-400 bg-violet-500/10">
                        <Mail className="w-3 h-3" />
                        {announcement.emailCount} Email{announcement.emailCount !== 1 ? "s" : ""}
                      </Badge>
                    )}

                    {announcement.sendSms && (
                      <Badge variant="secondary" className="gap-1 text-[10px] shrink-0 text-blue-700 dark:text-blue-400 bg-blue-500/10">
                        <MessageSquare className="w-3 h-3" />
                        {announcement.smsCount} SMS
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{format(new Date(announcement.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="max-w-[120px] truncate">{announcement.author?.name || "System"}</span>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <CardTitle className="text-lg font-bold tracking-tight break-words [overflow-wrap:anywhere] min-w-0">
                  {announcement.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 min-w-0">
                <div className="text-sm text-muted-foreground leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap min-w-0 overflow-x-auto">
                  {announcement.content}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
