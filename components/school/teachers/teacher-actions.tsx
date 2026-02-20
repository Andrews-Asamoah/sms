// components/school/teachers/teacher-actions.tsx
"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
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
import { TeacherDialog } from "./teacher-dialog";
import { toast } from "sonner";
import { Teacher } from "./columns";

interface TeacherActionsProps {
  teacher: Teacher;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface House {
  id: string;
  name: string;
  code: string;
}

export function TeacherActions({ teacher }: TeacherActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const schoolSlug = pathname.split("/")[1];

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch departments and houses for the edit dialog
  const [departments, setDepartments] = useState<Department[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/teachers/${teacher.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete teacher");
      }

      toast.success("Teacher deleted successfully", {
        description: `${teacher.profile.firstName} ${teacher.profile.lastName} has been removed.`,
      });

      setShowDeleteDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast.error("Failed to delete teacher", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function fetchEditData() {
    if (departments.length > 0) return; // Already loaded

    setLoadingData(true);
    try {
      const [deptResponse, houseResponse] = await Promise.all([
        fetch(`/api/schools/${schoolSlug}/departments`),
        fetch(`/api/schools/${schoolSlug}/houses`),
      ]);

      if (deptResponse.ok) {
        const deptData: Department[] = await deptResponse.json();
        setDepartments(deptData);
      }

      if (houseResponse.ok) {
        const houseData: House[] = await houseResponse.json();
        setHouses(houseData);
      }
    } catch (error) {
      console.error("Error fetching edit data:", error);
    } finally {
      setLoadingData(false);
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
            onClick={() => navigator.clipboard.writeText(teacher.id)}
          >
            Copy teacher ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              router.push(`/${schoolSlug}/admin/teachers/${teacher.id}`);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              fetchEditData();
              setShowEditDialog(true);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit teacher
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete teacher
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      {showEditDialog && !loadingData && (
        <TeacherDialog
          schoolId={teacher.schoolId}
          schoolSlug={schoolSlug}
          departments={departments}
          houses={houses}
          teacher={teacher}
        >
          <div />
        </TeacherDialog>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>
                {teacher.profile.firstName} {teacher.profile.lastName}
              </strong>
              .
              {(teacher._count.subjects > 0 ||
                teacher._count.classesAsClassTeacher > 0) && (
                <span className="block mt-2 text-amber-600 font-semibold">
                  Warning: This teacher has {teacher._count.subjects} subject
                  assignment(s)
                  {teacher._count.classesAsClassTeacher > 0 &&
                    ` and is a class teacher for ${teacher._count.classesAsClassTeacher} class(es)`}
                  .
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
              {isDeleting ? "Deleting..." : "Delete Teacher"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
