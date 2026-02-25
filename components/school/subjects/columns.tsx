"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { SubjectDialog } from "./subject-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type Subject = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  creditHours: number;
  isActive: boolean;
  departments: Array<{
    id: string;
    name: string;
  }>;
  _count: {
    teachers: number;
    classSubjects: number;
  };
};

// We need to pass departments to the columns so the edit dialog can access them
// This requires a custom column definition that accepts extra data, but for simplicity
// we will just define the columns type here and handle the dialog in the cell renderer
// by accepting departments in the props of the Table or passing them down.
// Ideally, the cell renderer should have access to the context or we pass props.
// A cleaner way is to create a component for the Cell that takes the row and the departments list.

export const columns = (
  schoolSlug: string,
  departments: Array<{ id: string; name: string }>,
): ColumnDef<Subject>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("code")}</Badge>,
  },
  {
    accessorKey: "departments",
    header: "Departments",
    cell: ({ row }) => {
      const depts = row.original.departments;
      if (!depts || depts.length === 0) return "N/A";
      return (
        <div className="flex flex-wrap gap-1">
          {depts.map((d) => (
            <Badge key={d.id} variant="secondary" className="font-normal">
              {d.name}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "creditHours",
    header: "Credit Hours",
    cell: ({ row }) => row.getValue("creditHours"),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");
      return (
        <Badge
          className={
            isActive
              ? "bg-emerald-500 hover:bg-emerald-600 text-white border-0"
              : "bg-rose-500 hover:bg-rose-600 text-white border-0"
          }
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "stats",
    header: "Statistics",
    cell: ({ row }) => {
      const stats = row.original._count;
      return (
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>{stats.classSubjects} Classes</span>
          <span>•</span>
          <span>{stats.teachers} Teachers</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const subject = row.original;
      const [showEditDialog, setShowEditDialog] = useState(false);
      const [showDeleteAlert, setShowDeleteAlert] = useState(false);
      const router = useRouter();

      const handleDelete = async () => {
        try {
          const response = await fetch(
            `/api/schools/${schoolSlug}/subjects/${subject.id}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Failed to delete subject");
          }

          toast.success("Subject deleted successfully");
          router.refresh();
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Something went wrong",
          );
        }
      };

      return (
        <>
          <SubjectDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            subject={subject}
            schoolSlug={schoolSlug}
            departments={departments}
          >
            <span className="hidden" />
          </SubjectDialog>
          <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  subject. Note: You cannot delete a subject that is assigned to
                  classes or teachers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(subject.id)}
              >
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteAlert(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      );
    },
  },
];
