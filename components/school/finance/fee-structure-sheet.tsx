"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FeeStructureForm } from "@/components/school/finance/fee-structure-form";

interface FeeStructure {
  id: string;
  name: string;
  description: string;
  classLevel: string;
  items: { id: string; name: string; amount: number }[];
}

interface FeeStructureSheetProps {
  schoolSlug: string;
  trigger?: React.ReactNode;
  feeStructure?: FeeStructure | null;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FeeStructureSheet({
  schoolSlug,
  trigger,
  feeStructure,
  onSuccess,
  open: controlledOpen,
  onOpenChange,
}: FeeStructureSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Fetch classes and departments when sheet opens
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classesRes, deptsRes] = await Promise.all([
          fetch(`/api/schools/${schoolSlug}/classes`),
          fetch(`/api/schools/${schoolSlug}/departments`),
        ]);

        if (classesRes.ok) {
          const c = await classesRes.json();
          setClasses(c);
        }
        if (deptsRes.ok) {
          const d = await deptsRes.json();
          setDepartments(d);
        }
      } catch (e) {
        console.error("Failed to fetch metadata for form", e);
      }
    };
    fetchData();
  }, [schoolSlug]);

  const handleSuccess = () => {
    setOpen(false);
    if (onSuccess) onSuccess();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>
            {feeStructure ? "Edit Fee Structure" : "New Fee Structure"}
          </SheetTitle>
          <SheetDescription>
            {feeStructure
              ? "Update the fee structure details below."
              : "Create a fee template and optionally assign it to classes or departments."}
          </SheetDescription>
        </SheetHeader>
        <div className="px-6 pb-6">
          <FeeStructureForm
            schoolSlug={schoolSlug}
            classes={classes}
            departments={departments}
            initialData={feeStructure}
            onSuccess={handleSuccess}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
