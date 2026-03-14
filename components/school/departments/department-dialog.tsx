"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DepartmentForm } from "./department-form";
import { Plus } from "lucide-react";
import { useState } from "react";

interface DepartmentDialogProps {
  schoolSlug: string;
  department?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function DepartmentDialog({
  schoolSlug,
  department,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
}: DepartmentDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;
  const onOpenChange = controlledOnOpenChange ?? setUncontrolledOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" className="sm:h-10 sm:px-4 sm:py-2 h-8 px-3 text-xs sm:text-sm">
            <Plus className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Add Department</span>
            <span className="sm:hidden">Add Dept</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>
            {department ? "Edit Department" : "Add Department"}
          </DialogTitle>
          <DialogDescription>
            {department
              ? "Make changes to the department details below."
              : "Create a new department for your school."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <DepartmentForm
            schoolSlug={schoolSlug}
            department={department}
            onSuccess={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
