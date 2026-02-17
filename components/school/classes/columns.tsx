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
import Link from "next/link";
import { DeleteClassButton } from "./delete-class-button";

// Type based on the prisma query in the page
export type ClassItem = {
  id: string;
  name: string;
  level: string;
  section?: string | null;
  isActive: boolean;
  capacity?: number | null;
  academicYear: {
    id: string;
    name: string;
  };
  classTeacher?: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  } | null;
  _count: {
    students: number;
    subjects: number;
  };
};

export const columns = (schoolSlug: string): ColumnDef<ClassItem>[] => [
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
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div>
          <div className="font-medium">{item.name}</div>
          {(item.level || item.section) && (
            <div className="text-xs text-muted-foreground">
              {item.level} {item.section ? `- ${item.section}` : ""}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "classTeacher",
    header: "Class Teacher",
    cell: ({ row }) => {
      const teacher = row.original.classTeacher;
      return teacher
        ? `${teacher.profile.firstName} ${teacher.profile.lastName}`
        : "-";
    },
  },
  {
    accessorKey: "academicYear",
    header: "Academic Year",
    cell: ({ row }) => row.original.academicYear.name,
  },
  {
    accessorKey: "stats",
    header: "Statistics",
    cell: ({ row }) => {
      const stats = row.original._count;
      const capacity = row.original.capacity;
      return (
        <div className="flex flex-col text-xs text-muted-foreground">
          <span>
            {stats.students} / {capacity || "∞"} Students
          </span>
          <span>{stats.subjects} Subjects</span>
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
    id: "actions",
    cell: ({ row }) => {
      const classItem = row.original;

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
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(classItem.id)}
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <Link href={`/${schoolSlug}/admin/classes/${classItem.id}`}>
              <DropdownMenuItem>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            </Link>
            {/* Using the logic from existing delete button but integrated into dropdown if possible, 
                  or just use a custom delete logic here. 
                  The existing DeleteClassButton is a Dialog trigger. 
                  We can't easily nest DialogTrigger in DropdownMenuItem without layout issues sometimes.
                  Alternative: Render Delete logic here directly.
              */}
            <DeleteClassMenuItem
              classId={classItem.id}
              className={classItem.name}
              schoolSlug={schoolSlug}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

function DeleteClassMenuItem({
  classId,
  className,
  schoolSlug,
}: {
  classId: string;
  className: string;
  schoolSlug: string;
}) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/classes/${classId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error("Failed to delete class");
      toast.success("Class deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  return (
    <>
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {className}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          setShowDeleteAlert(true);
        }}
        className="text-destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" /> Delete
      </DropdownMenuItem>
    </>
  );
}
