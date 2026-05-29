"use client";

import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, GraduationCap, Phone, Clock, Mail } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { BanUserButton } from "@/components/school/ban-user-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingInvitationRow } from "@/components/ui/pending-invitation-row";
import { PendingInvitationActionButtons } from "@/components/school/pending-invitation-action-buttons";

export type WardInfo = {
  id: string;
  name: string;
  studentId: string;
  class: string;
  relationship: string;
};

export type GuardianData = {
  id: string;
  guardianId: string;
  name: string;
  email: string | null | undefined;
  phone: string;
  altPhone: string | null;
  occupation: string | null;
  isActive: boolean;
  userId: string | null;
  isBanned: boolean;
  wards: WardInfo[];
};

type InvitationData = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
};

interface ParentsTableProps {
  schoolSlug: string;
  initialData: GuardianData[];
  initialInvitations?: InvitationData[];
}

export function ParentsTable({
  schoolSlug,
  initialData: data,
  initialInvitations: invitations = [],
}: ParentsTableProps) {

  const columns: ColumnDef<GuardianData>[] = [
    {
      accessorKey: "guardianId",
      header: "ID",
      cell: ({ row }) => (
        <span className="text-xs font-mono">{row.original.guardianId}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "wards",
      header: "Wards",
      cell: ({ row }) => {
        const wards = row.original.wards;
        if (wards.length === 0) {
          return (
            <span className="text-xs text-muted-foreground italic">None</span>
          );
        }

        return (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Badge variant="secondary" className="cursor-pointer">
                {wards.length} {wards.length === 1 ? "Ward" : "Wards"}
              </Badge>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Associated Students</h4>
                <div className="grid gap-2">
                  {wards.map((w) => (
                    <div
                      key={w.id}
                      className="text-sm p-2 bg-muted/50 rounded flex justify-between"
                    >
                      <div>
                        <div className="font-medium">{w.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {w.studentId} • {w.class}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-fit self-center"
                      >
                        {w.relationship.toLowerCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Contact",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm flex items-center gap-1">
            <Phone className="h-3 w-3 text-muted-foreground" />{" "}
            {row.original.phone}
          </span>
          {row.original.email && (
            <span className="text-xs text-muted-foreground">
              {row.original.email}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "occupation",
      header: "Occupation",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm capitalize">
          {row.original.occupation?.toLowerCase() || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "outline" : "destructive"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        if (!row.original.userId) return null;
        return (
          <BanUserButton
            schoolSlug={schoolSlug}
            userId={row.original.userId}
            isBanned={row.original.isBanned}
            userName={row.original.name}
          />
        );
      },
    },
  ];

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

  const totalWards = data.reduce((acc, curr) => acc + curr.wards.length, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Guardians"
          value={data.length}
          icon={Users}
        />
        <StatCard
          title="Linked Students"
          value={totalWards}
          icon={GraduationCap}
          description="Total wards tracked across all parents"
        />
      </div>

      <Tabs defaultValue="directory" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border">
          <TabsTrigger value="directory">
            Active Guardians ({data.length})
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
          <div className="bg-background rounded-md border shadow-sm p-4">
            <DataTable columns={columns} data={data} searchKey="name" />
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                Pending Guardian Invitations
              </CardTitle>
              <CardDescription>
                These parents or guardians have been invited but haven&apos;t joined the portal yet.
                Their uncompleted profiles will be activated and linked to their wards once they accept and sign up.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <Mail className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No pending guardian invitations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((inv) => {
                    const isExpired = new Date(inv.expiresAt) < new Date();
                    const timeText = getExpiryText(inv.expiresAt);

                    return (
                      <PendingInvitationRow
                        key={inv.id}
                        isError={isExpired}
                        primary={<span className="font-semibold">{inv.email}</span>}
                        secondary={
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>Sent on {new Date(inv.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}</span>
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
                          <PendingInvitationActionButtons
                            schoolSlug={schoolSlug}
                            invitationId={inv.id}
                            email={inv.email}
                          />
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
    </div>
  );
}
