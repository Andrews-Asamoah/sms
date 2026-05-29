"use client";

import Link from "next/link";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { BanUserButton } from "@/components/school/ban-user-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingInvitationRow } from "@/components/ui/pending-invitation-row";
import { PendingInvitationActionButtons } from "@/components/school/pending-invitation-action-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Mail } from "lucide-react";

type StaffData = {
  id: string;
  profileId: string | null;
  schoolId: string;
  userId?: string;
  employeeId: string | null;
  firstName: string | undefined;
  lastName: string | undefined;
  email: string | null | undefined;
  phone: string | null | undefined;
  type: string;
  category: "TEACHING" | "NON_TEACHING";
  isActive: boolean;
  isBanned?: boolean;
  hireDate: Date;
  gender: string | null | undefined;
};

type InvitationData = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
};

interface StaffClientProps {
  schoolSlug: string;
  initialData: StaffData[];
  initialInvitations?: InvitationData[];
}

export function StaffClient({
  schoolSlug,
  initialData: data,
  initialInvitations: invitations = [],
}: StaffClientProps) {

  const columns: ColumnDef<StaffData>[] = [
    {
      accessorKey: "employeeId",
      header: "Employee ID",
      cell: ({ row }) => (
        <span className="text-xs font-mono">
          {row.original.employeeId || "N/A"}
        </span>
      ),
    },
    {
      id: "name",
      header: "Name",
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => (
        <Link href={`/${schoolSlug}/admin/staff/${row.original.id}`}>
          <span className="font-semibold cursor-pointer text-primary hover:underline">
            {row.original.firstName} {row.original.lastName}
          </span>
        </Link>
      ),
    },
    {
      accessorKey: "type",
      header: "Job Title / Role",
      cell: ({ row }) => (
        <span className="capitalize">{row.original.type.toLowerCase()}</span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.category === "TEACHING" ? "default" : "secondary"
          }
        >
          {row.original.category === "TEACHING" ? "Teaching" : "Non-Teaching"}
        </Badge>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.email || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.phone || "N/A"}
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
            isBanned={row.original.isBanned ?? false}
            userName={`${row.original.firstName} ${row.original.lastName}`}
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

  return (
    <Tabs defaultValue="directory" className="space-y-6">
      <TabsList className="bg-muted/60 p-1 border">
        <TabsTrigger value="directory">
          Active Staff ({data.length})
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
          <DataTable
            columns={columns}
            data={data}
            searchKey="name"
            exportTitle="Staff List Report"
          />
        </div>
      </TabsContent>

      <TabsContent value="pending" className="space-y-6">
        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              These staff members have been invited but haven&apos;t accepted yet.
              They can use their invitation links to register and sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Mail className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No pending staff invitations</p>
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
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="capitalize px-1.5 py-0.5 bg-muted rounded font-mono text-[10px]">
                            {inv.role.toLowerCase()}
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
  );
}
