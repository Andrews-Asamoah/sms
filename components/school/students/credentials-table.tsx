"use client";

import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  getFilteredRowModel,
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
import { Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface StudentCredentialData {
  id: string;
  studentId: string;
  plainTextPassword: string | null;
  profile: {
    firstName: string;
    lastName: string;
    otherNames: string | null;
    user: {
      email: string;
    } | null;
  };
  class: {
    name: string;
  } | null;
}

interface CredentialsTableProps {
  data: StudentCredentialData[];
  schoolSlug: string;
}

export function CredentialsTable({ data, schoolSlug }: CredentialsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {}
  );

  const togglePassword = (id: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
  };

  const columns: ColumnDef<StudentCredentialData>[] = [
    {
      accessorKey: "studentId",
      header: "Student ID",
      cell: ({ row }) => (
        <span className="font-mono">{row.getValue("studentId")}</span>
      ),
    },
    {
      id: "name",
      header: "Name",
      accessorFn: (row) =>
        `${row.profile.firstName} ${row.profile.lastName} ${row.profile.otherNames || ""}`,
      cell: ({ row }) => {
        const p = row.original.profile;
        return (
          <div className="font-medium">
            {p.firstName} {p.lastName} {p.otherNames}
          </div>
        );
      },
    },
    {
      id: "class",
      header: "Class",
      accessorFn: (row) => row.class?.name || "Unassigned",
      cell: ({ row }) => <Badge variant="outline">{row.getValue("class")}</Badge>,
    },
    {
      id: "username",
      header: "Username (Email)",
      accessorFn: (row) => row.profile.user?.email || "No Account",
      cell: ({ row }) => {
        const email = row.getValue("username") as string;
        return (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{email}</span>
            {email !== "No Account" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(email)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "plainTextPassword",
      header: "Password",
      cell: ({ row }) => {
        const pwd = row.getValue("plainTextPassword") as string | null;
        const studentId = row.original.id;
        const isVisible = showPasswords[studentId];

        if (!pwd) {
          return <span className="text-muted-foreground italic">None set</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <span className="font-mono min-w-[100px] tracking-wider bg-muted px-2 py-1 rounded">
              {isVisible ? pwd : "••••••••"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => togglePassword(studentId)}
              title={isVisible ? "Hide" : "Show"}
            >
              {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => copyToClipboard(pwd)}
              title="Copy"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const studentName = `${row.original.profile.firstName} ${row.original.profile.lastName}`;
        return (
          <ResetPasswordDialog
            studentId={row.original.id}
            studentName={studentName}
            schoolSlug={schoolSlug}
          />
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center py-4">
        <Input
          placeholder="Search students, IDs, classes..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
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
                        cell.getContext()
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
