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
import { useSchoolData } from "@/lib/school-data-context";

interface FeeStructure {
  id: string;
  name: string;
  description: string;
  items: {
    id: string;
    name: string;
    amount: number;
    registryItemId?: string;
  }[];
  targetClasses: { classId: string }[];
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
  const { classes, departments, feeItems: feeItemRegistry, fetchClasses, fetchDepartments, fetchFeeItems } = useSchoolData();

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Fetch context data when sheet opens
  useEffect(() => {
    if (!open) return;
    fetchClasses();
    fetchDepartments();
    fetchFeeItems();
  }, [open, fetchClasses, fetchDepartments, fetchFeeItems]);

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
            feeItemRegistry={feeItemRegistry}
            initialData={feeStructure}
            onSuccess={handleSuccess}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
