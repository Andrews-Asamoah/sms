"use client";


import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Phone } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { BanUserButton } from "@/components/school/ban-user-button";


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


interface ParentsTableProps {
  schoolSlug: string;
  initialData: GuardianData[];
}

export function ParentsTable({ schoolSlug, initialData: data }: ParentsTableProps) {

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

      <div className="bg-background rounded-md border shadow-sm p-4">
        <DataTable columns={columns} data={data} searchKey="name" />
      </div>
    </div>
  );
}
