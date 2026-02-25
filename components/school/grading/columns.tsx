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
import { GradingSystemDialog } from "./grading-system-dialog";
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

export type GradingSystem = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isSchoolDefault: boolean;
  isActive: boolean;
  gradeScales: {
    grade: string;
    description: string;
    minScore: any;
    maxScore: any;
    gradePoint: any;
  }[];
  _count: {
    gradeScales: number;
    assessmentTemplates: number;
  };
};

export const columns = (schoolSlug: string): ColumnDef<GradingSystem>[] => [
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
    accessorKey: "isSchoolDefault",
    header: "Default",
    cell: ({ row }) => {
      const isDefault = row.getValue("isSchoolDefault");
      return isDefault ? <Badge>Default</Badge> : null;
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
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
          <span>{stats.gradeScales} Grades</span>
          <span>•</span>
          <span>{stats.assessmentTemplates} Templates</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const gradingSystem = row.original;
      const [showEditDialog, setShowEditDialog] = useState(false);
      const [showDeleteAlert, setShowDeleteAlert] = useState(false);
      const router = useRouter();

      const handleDelete = async () => {
        try {
          const response = await fetch(
            `/api/schools/${schoolSlug}/grading/${gradingSystem.id}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Failed to delete grading system");
          }

          toast.success("Grading system deleted successfully");
          router.refresh();
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Something went wrong",
          );
        }
      };

      return (
        <>
          <GradingSystemDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            gradingSystem={gradingSystem}
            schoolSlug={schoolSlug}
          >
            <span className="hidden" />
          </GradingSystemDialog>
          <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  grading system. Note: You cannot delete a grading system used
                  in assessment templates.
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
                onClick={() => navigator.clipboard.writeText(gradingSystem.id)}
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
