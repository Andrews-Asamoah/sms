"use client";

import { TeachersDataTable } from "@/components/school/teachers/teachers-table";
import { columns, Teacher } from "@/components/school/teachers/columns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingInvitationRow } from "@/components/ui/pending-invitation-row";
import { PendingInvitationActionButtons } from "@/components/school/pending-invitation-action-buttons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Mail } from "lucide-react";

type PendingTeacherInvitation = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  invitationEmail: string | null;
  employmentType: string;
  createdAt: Date;
  department: { name: string };
  invitationId: string;
  expiresAt: Date;
  status: string;
};

interface TeachersClientProps {
  data: Teacher[];
  schoolSlug: string;
  departments: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  houses: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  initialInvitations?: PendingTeacherInvitation[];
}

export function TeachersClient({
  data,
  schoolSlug,
  departments,
  houses,
  initialInvitations: invitations = [],
}: TeachersClientProps) {

  const getExpiryText = (expiresAt: Date) => {
    const diffMs = new Date(expiresAt).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffMs < 0) {
      const expiredDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      return `Expired ${expiredDays === 0 ? "today" : `${expiredDays} day${expiredDays > 1 ? "s" : ""} ago`}`;
    }
    if (diffDays === 0) {
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      return `Expires in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
    }
    return `Expires in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
  };

  return (
    <Tabs defaultValue="directory" className="space-y-6">
      <TabsList className="bg-muted/60 p-1 border">
        <TabsTrigger value="directory">
          Active Teachers ({data.length})
        </TabsTrigger>
        <TabsTrigger value="pending" className="relative">
          Pending Invitations
          {invitations.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 border-none shrink-0 font-semibold"
            >
              {invitations.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="directory" className="space-y-6">
        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>All Teachers</CardTitle>
            <CardDescription>
              View and manage all teaching staff and their assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeachersDataTable
              columns={columns}
              data={data}
              schoolSlug={schoolSlug}
              departments={departments}
              houses={houses}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pending" className="space-y-6">
        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Pending Teacher Invitations
            </CardTitle>
            <CardDescription>
              These teachers have been invited but haven&apos;t accepted yet.
              Their profile details will be linked automatically when they sign up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Mail className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No pending teacher invitations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((inv) => {
                  const isExpired = new Date(inv.expiresAt) < new Date();
                  const timeText = getExpiryText(inv.expiresAt);
                  const displayName =
                    inv.firstName || inv.lastName
                      ? `${inv.firstName ?? ""} ${inv.lastName ?? ""}`.trim()
                      : inv.invitationEmail || "Unknown Teacher";

                  return (
                    <PendingInvitationRow
                      key={inv.id}
                      isError={isExpired}
                      primary={<span className="font-semibold">{displayName}</span>}
                      secondary={
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          {inv.invitationEmail && (
                            <span>{inv.invitationEmail} •</span>
                          )}
                          <span className="capitalize px-1.5 py-0.5 bg-muted rounded text-[10px]">
                            {inv.department.name}
                          </span>
                          <span>•</span>
                          <span className="capitalize px-1.5 py-0.5 bg-muted rounded text-[10px]">
                            {inv.employmentType.replace("_", " ").toLowerCase()}
                          </span>
                          <span>•</span>
                          <span>
                            Sent{" "}
                            {new Date(inv.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span>•</span>
                          <span className={isExpired ? "text-red-500 font-medium" : "text-muted-foreground"}>
                            {timeText}
                          </span>
                        </span>
                      }
                      badges={
                        <Badge
                          variant={isExpired ? "destructive" : "outline"}
                          className={isExpired ? "" : "text-yellow-600 border-yellow-500/50 shrink-0 bg-yellow-50/50 dark:bg-yellow-950/20"}
                        >
                          {isExpired ? "Expired" : "Awaiting signup"}
                        </Badge>
                      }
                      action={
                        inv.invitationId ? (
                          <PendingInvitationActionButtons
                            schoolSlug={schoolSlug}
                            invitationId={inv.invitationId}
                            email={inv.invitationEmail!}
                          />
                        ) : null
                      }
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
