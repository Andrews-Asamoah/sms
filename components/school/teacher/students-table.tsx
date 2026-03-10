"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TeacherStudent {
  id: string;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  admissionNumber: string | null;
  image: string | null;
  email: string | null;
  gender: string;
  guardians: {
    name: string;
    relationship: string;
    phone: string | null;
    email: string | null;
  }[];
}

interface TeacherStudentsTableProps {
  data: TeacherStudent[];
}

export function TeacherStudentsTable({ data }: TeacherStudentsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns: ColumnDef<TeacherStudent>[] = [
    {
      accessorKey: "student",
      header: "Student",
      cell: ({ row }) => {
        const student = row.original;
        const initials =
          `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                {student.firstName} {student.lastName}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono flex flex-col">
                <span>{student.admissionNumber || "No Adm #"}</span>
                <span className="text-primary/70">{student.email}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "gender",
      header: "Gender",
      cell: ({ row }) => (
        <span className="capitalize text-sm">
          {row.original.gender.toLowerCase()}
        </span>
      ),
    },
    {
      accessorKey: "guardians",
      header: "Guardian / Contact",
      cell: ({ row }) => {
        const guardian = row.original.guardians[0];
        if (!guardian)
          return (
            <span className="text-muted-foreground text-xs italic">
              No guardian info
            </span>
          );

        return (
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {guardian.name}{" "}
              <span className="text-[10px] text-muted-foreground font-normal">
                ({guardian.relationship})
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {guardian.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {guardian.phone}
                </div>
              )}
              {guardian.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {guardian.email}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
            <Link href={`#`}>Profile</Link>
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-9 px-3">
            {data.length} Students
          </Badge>
        </div>
      </div>

      <div className="rounded-md border bg-card/50">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-xs text-muted-foreground flex-1">
          Showing{" "}
          {table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
            1}{" "}
          to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            data.length,
          )}{" "}
          of {data.length} students
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

import Link from "next/link";
