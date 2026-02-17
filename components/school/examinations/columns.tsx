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
import { ExamDialog } from "./exam-dialog";
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

export type Exam = {
  id: string;
  name: string;
  gradingSystemId: string;
  classLevel?: string | null;
  subjectCode?: string | null;
  termNumber?: number | null;
  description?: string | null;
  isActive: boolean;
  gradingSystem: {
    id: string;
    name: string;
  };
  _count: {
    assessmentScores: number;
    components: number;
  };
};

export const columns = (
  schoolSlug: string,
  gradingSystems: Array<{ id: string; name: string }>,
): ColumnDef<Exam>[] => [
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
    accessorKey: "gradingSystem",
    header: "Grading System",
    cell: ({ row }) => {
      const gs = row.original.gradingSystem;
      return gs ? gs.name : "N/A";
    },
  },
  {
    accessorKey: "details",
    header: "Details",
    cell: ({ row }) => {
      const exam = row.original;
      return (
        <div className="flex flex-col text-xs text-muted-foreground">
          {exam.classLevel && <span>Level: {exam.classLevel}</span>}
          {exam.subjectCode && <span>Subject: {exam.subjectCode}</span>}
          {exam.termNumber && <span>Term: {exam.termNumber}</span>}
          {!exam.classLevel && !exam.subjectCode && !exam.termNumber && (
            <span>-</span>
          )}
        </div>
      );
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
          <span>{stats.components} Components</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const exam = row.original;
      const [showEditDialog, setShowEditDialog] = useState(false);
      const [showDeleteAlert, setShowDeleteAlert] = useState(false);
      const router = useRouter();

      const handleDelete = async () => {
        try {
          const response = await fetch(
            `/api/schools/${schoolSlug}/examinations/${exam.id}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Failed to delete examination");
          }

          toast.success("Examination deleted successfully");
          router.refresh();
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Something went wrong",
          );
        }
      };

      return (
        <>
          <ExamDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            exam={exam}
            schoolSlug={schoolSlug}
            gradingSystems={gradingSystems}
          >
            <span className="hidden" />
          </ExamDialog>
          <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  examination template. Note: You cannot delete an examination
                  that has recorded scores.
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
                onClick={() => navigator.clipboard.writeText(exam.id)}
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
