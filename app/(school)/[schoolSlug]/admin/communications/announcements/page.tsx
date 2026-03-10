import { Metadata } from "next";
import { requireSchoolAccess } from "@/lib/auth/guards";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { Megaphone, Plus, Calendar, User } from "lucide-react";

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground">
            Broadcast messages to students, teachers, and parents.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 shadow-md">
          <Plus className="w-4 h-4 mr-2" /> New Announcement
        </Button>
      </div>

      <div className="grid gap-6">
        {announcements.length === 0 ? (
          <Card className="border-dashed h-[300px] flex items-center justify-center text-center">
            <div className="space-y-4">
              <Megaphone className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
              <div>
                <h3 className="text-lg font-semibold text-muted-foreground">
                  No Announcements Yet
                </h3>
                <p className="text-sm text-muted-foreground/60">
                  Start communicating with your school community today.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-gradient-to-r from-background to-muted/10"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <Megaphone className="w-3 h-3" />
                    Announcement
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(announcement.createdAt), "MMMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {announcement.author?.name || "System"}
                    </div>
                  </div>
                </div>
                <CardTitle className="text-xl">{announcement.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {announcement.content}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
