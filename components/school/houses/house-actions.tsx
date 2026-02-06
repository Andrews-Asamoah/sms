// components/school/houses/house-actions.tsx
"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { HouseDialog } from "./house-dialog";
import { toast } from "sonner";
import { House } from "./columns";

interface HouseActionsProps {
  house: House;
}

interface Teacher {
  id: string;
  profile: {
    firstName: string;
    lastName: string;
  };
}

export function HouseActions({ house }: HouseActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const schoolSlug = pathname.split("/")[1];

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/houses/${house.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete house");
      }

      toast.success("House deleted successfully", {
        description: `${house.name} has been removed.`,
      });

      setShowDeleteDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Error deleting house:", error);
      toast.error("Failed to delete house", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  // Fetch teachers for the edit dialog
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  async function fetchTeachers() {
    if (teachers.length > 0) return; // Already loaded

    setLoadingTeachers(true);
    try {
      const response = await fetch(`/api/schools/${schoolSlug}/teachers`);
      if (response.ok) {
        const data: Teacher[] = await response.json();
        setTeachers(data);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoadingTeachers(false);
    }
  }

  return (
    <>
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
            onClick={() => navigator.clipboard.writeText(house.id)}
          >
            Copy house ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              fetchTeachers();
              setShowEditDialog(true);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit house
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete house
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      {showEditDialog && !loadingTeachers && (
        <HouseDialog
          schoolId={house.id}
          schoolSlug={schoolSlug}
          teachers={teachers}
          house={house}
        >
          <div />
        </HouseDialog>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{house.name}</strong>.
              {house._count.students > 0 && (
                <span className="block mt-2 text-amber-600 font-semibold">
                  Warning: This house has {house._count.students} student(s)
                  assigned. They will be unassigned from this house.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete House"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
