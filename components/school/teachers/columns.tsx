// components/school/teachers/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import { TeacherActions } from "./teacher-actions";

export type Teacher = {
  id: string;
  teacherId: string;
  schoolId: string;
  staffNumber: string | null;
  invitationEmail: string | null;
  isActive: boolean;
  employmentType: string;
  qualification: string | null;
  specialization: string | null;
  experience: number | null;
  hireDate: Date;
  contractEndDate: Date | null;
  monthlySalary: number | null;
  profile: {
    firstName: string;
    lastName: string;
    otherNames: string | null;
    gender: string;
    dateOfBirth: Date;
    phone: string | null;
    email?: string;
    userId: string;
    user?: {
      id: string;
      email?: string;
      banned: boolean | null;
      banReason: string | null;
    };
  };
  department: {
    id: string;
    name: string;
    code: string;
  };
  house: {
    id: string;
    name: string;
    code: string;
  } | null;
  _count: {
    subjects: number;
    classesAsClassTeacher: number;
  };
};

const employmentTypeColors: Record<string, string> = {
  FULL_TIME: "bg-blue-500/10 text-blue-700 border-blue-200",
  PART_TIME: "bg-purple-500/10 text-purple-700 border-purple-200",
  CONTRACT: "bg-orange-500/10 text-orange-700 border-orange-200",
  TEMPORARY: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  INTERN: "bg-pink-500/10 text-pink-700 border-pink-200",
};

export const columns: ColumnDef<Teacher>[] = [
  {
    accessorKey: "teacher",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Teacher" />
    ),
    cell: ({ row }) => {
      const teacher = row.original;
      if (!teacher.profile) {
        return (
          <div className="flex items-center gap-3 opacity-60">
            <Avatar>
              <AvatarFallback>?</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium italic">Pending Invitation</div>
              <div className="text-sm text-muted-foreground">
                Sent to {teacher.profile ? "profile" : "Invited User"}
              </div>
            </div>
          </div>
        );
      }
      
      const initials =
        `${teacher.profile.firstName?.charAt(0) || ""}${teacher.profile.lastName?.charAt(0) || ""}`.toUpperCase();

      return (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {teacher.profile.firstName} {teacher.profile.lastName}
              {teacher.profile.otherNames && (
                <span className="text-muted-foreground ml-1">
                  {teacher.profile.otherNames}
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {teacher.profile.phone || teacher.profile.email || "No contact"}
            </div>
          </div>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const teacher = row.original;
      const profile = teacher.profile;
      const searchString =
        `${profile?.firstName || ""} ${profile?.lastName || ""} ${profile?.otherNames || ""} ${teacher.teacherId} ${teacher.staffNumber || ""} ${teacher.invitationEmail || ""}`.toLowerCase();
      return searchString.includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "teacherId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Teacher ID" />
    ),
    cell: ({ row }) => {
      const teacher = row.original;
      return (
        <div>
          <div className="font-mono text-sm">{teacher.teacherId}</div>
          {teacher.staffNumber && (
            <div className="text-xs text-muted-foreground">
              Staff: {teacher.staffNumber}
            </div>
          )}
        </div>
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
      return (
        <div>
          <div className="font-medium">{dept.name}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {dept.code}
          </div>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return row.original.department.name
        .toLowerCase()
        .includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "house",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="House" />
    ),
    cell: ({ row }) => {
      const house = row.original.house;
      if (!house) {
        return <span className="text-muted-foreground text-sm">-</span>;
      }
      return (
        <div className="text-sm">
          <div className="font-medium">{house.name}</div>
          <div className="text-xs text-muted-foreground">{house.code}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "employmentType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Employment" />
    ),
    cell: ({ row }) => {
      const type = row.original.employmentType;
      return (
        <Badge variant="outline" className={employmentTypeColors[type] || ""}>
          {type.replace("_", " ")}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "assignments",
    header: "Assignments",
    cell: ({ row }) => {
      const teacher = row.original;
      return (
        <div className="text-sm">
          <div>{teacher._count.subjects} subject(s)</div>
          {teacher._count.classesAsClassTeacher > 0 && (
            <div className="text-xs text-muted-foreground">
              {teacher._count.classesAsClassTeacher} class teacher
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const teacher = row.original;
      const isBanned = teacher.profile.user?.banned;
      
      if (isBanned) {
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-700 border-red-300"
          >
            Banned
          </Badge>
        );
      }

      const isActive = teacher.isActive;
      return (
        <Badge
          variant="outline"
          className={
            isActive
              ? "bg-green-500/10 text-green-700 border-green-300"
              : "bg-gray-500/10 text-gray-700 border-gray-300"
          }
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );

    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <TeacherActions teacher={row.original} />,
  },
];
