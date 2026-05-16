// components/school/teachers/teacher-actions.tsx
"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MoreHorizontal, Edit, Trash2, Eye, ShieldBan, ShieldCheck } from "lucide-react";
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
import { BanUserButton } from "../ban-user-button";
import { toast } from "sonner";
import { Teacher } from "./columns";
import { useSchoolData } from "@/lib/school-data-context";

interface TeacherActionsProps {
  teacher: Teacher;
}

// Local interfaces removed as we use the context types, but if they are still needed for TeacherDialog props, we can make code optional:
interface Department {
  id: string;
  name: string;
  code?: string;
}

interface House {
  id: string;
  name: string;
  code?: string;
}

export function TeacherActions({ teacher }: TeacherActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const schoolSlug = pathname.split("/")[1];

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { departments, houses, fetchDepartments, fetchHouses } = useSchoolData();

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
    await Promise.all([fetchDepartments(), fetchHouses()]);
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

          {teacher.profile?.userId && (
            <BanUserButton
              schoolSlug={schoolSlug}
              userId={teacher.profile.userId}
              isBanned={teacher.profile.user?.banned ?? false}
              userName={`${teacher.profile.firstName} ${teacher.profile.lastName}`}
              trigger={
                <DropdownMenuItem 
                  onSelect={(e) => e.preventDefault()}
                  className={teacher.profile.user?.banned ? "text-green-600" : "text-amber-600"}
                >
                  {teacher.profile.user?.banned ? (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Unban teacher
                    </>
                  ) : (
                    <>
                      <ShieldBan className="mr-2 h-4 w-4" />
                      Ban teacher
                    </>
                  )}
                </DropdownMenuItem>
              }
            />
          )}


          <DropdownMenuSeparator />
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
      <TeacherDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        schoolId={teacher.schoolId}
        schoolSlug={schoolSlug}
        departments={departments}
        houses={houses}
        teacher={teacher}
      >
        <div />
      </TeacherDialog>

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
