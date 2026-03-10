"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Briefcase } from "lucide-react";
import { BanUserButton } from "@/components/school/ban-user-button";

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

interface StaffClientProps {
  schoolSlug: string;
  initialData: StaffData[];
}

export function StaffClient({ schoolSlug, initialData }: StaffClientProps) {
  const [data] = useState<StaffData[]>(initialData);

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
        <span className="font-semibold cursor-pointer text-primary hover:underline">
          {row.original.firstName} {row.original.lastName}
        </span>
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
      }
    },
  ];

  const teachingCount = data.filter((s) => s.category === "TEACHING").length;
  const nonTeachingCount = data.filter(
    (s) => s.category === "NON_TEACHING",
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Teaching Staff
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Non-Teaching Staff
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nonTeachingCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-background rounded-md border shadow-sm p-4">
        <DataTable columns={columns} data={data} searchKey="name" />
      </div>
    </div>
  );
}
