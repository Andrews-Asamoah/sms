// components/school/students/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import { StudentActions } from "./student-actions";

export type Student = {
  id: string;
  studentId: string;
  admissionNumber: string | null;
  status: string;
  profile: {
    userId: string;
    firstName: string;
    lastName: string;
    gender: string;
    phone: string | null;
    user?: {
      email: string;
      banned: boolean;
      banReason: string | null;
    };
  };
  class: {
    name: string;
    academicYear: {
      name: string;
    };
  } | null;
  department: {
    name: string;
  } | null;
  house: {
    name: string;
  } | null;
  _count: {
    guardians: number;
    bills: number;
  };
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-700 border-green-200",
  GRADUATED: "bg-blue-500/10 text-blue-700 border-blue-200",
  WITHDRAWN: "bg-orange-500/10 text-orange-700 border-orange-200",
  SUSPENDED: "bg-red-500/10 text-red-700 border-red-200",
  TRANSFERRED: "bg-purple-500/10 text-purple-700 border-purple-200",
  EXPELLED: "bg-gray-500/10 text-gray-700 border-gray-200",
};

export const columns: ColumnDef<Student>[] = [
  {
    accessorKey: "student",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Student" />
    ),
    cell: ({ row }) => {
      const student = row.original;
      const initials =
        `${student.profile.firstName.charAt(0)}${student.profile.lastName.charAt(0)}`.toUpperCase();

      return (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {student.profile.firstName} {student.profile.lastName}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono flex flex-col">
              <span>{student.profile.phone || "No phone"}</span>
              <span className="text-primary font-semibold">
                {student.profile.user?.email}
              </span>
            </div>
          </div>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const student = row.original;
      const searchString =
        `${student.profile.firstName} ${student.profile.lastName} ${student.studentId} ${student.admissionNumber || ""}`.toLowerCase();
      return searchString.includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "studentId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Student ID" />
    ),
    cell: ({ row }) => {
      const student = row.original;
      return (
        <div>
          <div className="font-mono text-sm">{student.studentId}</div>
          {student.admissionNumber && (
            <div className="text-xs text-muted-foreground">
              Adm: {student.admissionNumber}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "class",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Class" />
    ),
    cell: ({ row }) => {
      const classInfo = row.original.class;
      if (!classInfo) {
        return <span className="text-muted-foreground">Not assigned</span>;
      }
      return (
        <div>
          <div className="font-medium">{classInfo.name}</div>
          <div className="text-sm text-muted-foreground">
            {classInfo.academicYear.name}
          </div>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return (
        row.original.class?.name.toLowerCase().includes(value.toLowerCase()) ??
        false
      );
    },
  },
  {
    accessorKey: "department",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Department" />
    ),
    cell: ({ row }) => {
      const dept = row.original.department;
      return dept ? (
        dept.name
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    accessorKey: "gender",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Gender" />
    ),
    cell: ({ row }) => {
      return (
        <span className="capitalize">
          {row.original.profile.gender.toLowerCase()}
        </span>
      );
    },
  },
  {
    accessorKey: "guardians",
    header: "Guardians",
    cell: ({ row }) => {
      return (
        <div className="text-sm">
          {row.original._count.guardians} guardian(s)
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant="outline" className={statusColors[status] || ""}>
          {status}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <StudentActions student={row.original} />,
  },
];
