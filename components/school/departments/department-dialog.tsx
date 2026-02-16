
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
            <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
            </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? "Edit Department" : "Add Department"}</DialogTitle>
          <DialogDescription>
            {department
              ? "Make changes to the department details below."
              : "Create a new department for your school."}
          </DialogDescription>
        </DialogHeader>
        <DepartmentForm
          schoolSlug={schoolSlug}
          department={department}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
