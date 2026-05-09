// components/school/subjects/subjects-data-table.tsx
"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { SubjectDialog } from "./subject-dialog";
import { DeleteSubjectButton } from "./delete-subject-button";
import type { Subject, Department } from "@/lib/generated/prisma/client";

type SubjectWithRelations = Subject & {
  department: Department;
  _count: {
    teachers: number;
    classSubjects: number;
    assessmentScores: number;
  };
};

interface SubjectsDataTableProps {
  data: SubjectWithRelations[];
  schoolSlug: string;
  schoolId: string;
  organizationId: string;
  departments: Department[];
}

export function SubjectsDataTable({
  data,
  schoolSlug,
  schoolId,
  organizationId,
  departments,
}: SubjectsDataTableProps) {
  const columns: ColumnDef<SubjectWithRelations>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Code" />
      ),
      cell: ({ row }) => (
        <div className="font-mono font-medium">{row.getValue("code")}</div>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subject Name" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "department",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Department" />
      ),
      cell: ({ row }) => {
        const dept = row.original.department;
        return <div className="text-sm">{dept.name}</div>;
      },
      filterFn: (row, id, value) => {
        return row.original.department.name
          .toLowerCase()
          .includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "periodsPerWeek",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Periods/Wk" />
      ),
      cell: ({ row }) => (
        <div className="text-center font-medium">
          {row.getValue("periodsPerWeek")}
          <span className="text-muted-foreground text-xs ml-1">/wk</span>
        </div>
      ),
    },
    {
      id: "teachers",
      header: "Teachers",
      cell: ({ row }) => (
        <div className="text-center">{row.original._count.teachers}</div>
      ),
    },
    {
      id: "classes",
      header: "Classes",
      cell: ({ row }) => (
        <div className="text-center">{row.original._count.classSubjects}</div>
      ),
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        const isActive = row.getValue("isActive") as boolean;
        if (value === "all") return true;
        if (value === "active") return isActive;
        if (value === "inactive") return !isActive;
        return true;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const subject = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href={`/${schoolSlug}/admin/academic/subjects/${subject.id}`}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <SubjectDialog
                schoolSlug={schoolSlug}
                departments={departments}
                subject={subject}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Subject
                </DropdownMenuItem>
              </SubjectDialog>
              <DropdownMenuSeparator />
              <DeleteSubjectButton
                subjectId={subject.id}
                subjectName={subject.name}
                schoolSlug={schoolSlug}
                hasTeachers={subject._count.teachers > 0}
                hasClasses={subject._count.classSubjects > 0}
                hasAssessments={subject._count.assessmentScores > 0}
              >
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Subject
                </DropdownMenuItem>
              </DeleteSubjectButton>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={data} searchKey="name" />;
}
