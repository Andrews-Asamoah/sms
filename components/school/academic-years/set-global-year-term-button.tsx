// components/admin/academic-years/set-global-year-term-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

interface Term {
  id: string;
  name: string;
  termNumber: number;
}

interface AcademicYear {
  id: string;
  name: string;
  terms: Term[];
}

interface SetGlobalYearTermButtonProps {
  schoolId: string;
  schoolSlug: string;
  academicYears: AcademicYear[];
  currentYearId?: string;
  currentTermId?: string;
}

export function SetGlobalYearTermButton({
  schoolId,
  schoolSlug,
  academicYears,
  currentYearId,
  currentTermId,
}: SetGlobalYearTermButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedYearId, setSelectedYearId] = useState(currentYearId || "");
  const [selectedTermId, setSelectedTermId] = useState(currentTermId || "");

  const selectedYear = academicYears.find((y) => y.id === selectedYearId);
  const availableTerms = selectedYear?.terms || [];

  // Auto-select first term when year changes
  const handleYearChange = (yearId: string) => {
    setSelectedYearId(yearId);
    const year = academicYears.find((y) => y.id === yearId);
    if (year && year.terms.length > 0) {
      setSelectedTermId(year.terms[0].id);
    } else {
      setSelectedTermId("");
    }
  };

  async function handleUpdate() {
    if (!selectedYearId || !selectedTermId) {
      toast.error("Error", {
        description: "Please select both academic year and term",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/set-global-year-term`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            academicYearId: selectedYearId,
            termId: selectedTermId,
            schoolId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update global settings");
      }

      const year = academicYears.find((y) => y.id === selectedYearId);
      const term = year?.terms.find((t) => t.id === selectedTermId);

      toast.success("Global settings updated", {
        description: `Set to ${year?.name} - ${term?.name}`,
      });

      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          <Settings2 className="mr-2 h-5 w-5" />
          Update Global Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="border-0 bg-card/95 backdrop-blur-xl sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set Global Academic Year & Term</DialogTitle>
          <DialogDescription>
            This will set the default academic year and term for all users
            (students, teachers, staff). Only admins and owners can change this.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Field>
            <FieldLabel htmlFor="academicYear">
              Academic Year <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldGroup>
              <Select value={selectedYearId} onValueChange={handleYearChange}>
                <SelectTrigger id="academicYear" className="bg-background/50">
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="term">
              Term <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldGroup>
              <Select
                value={selectedTermId}
                onValueChange={setSelectedTermId}
                disabled={!selectedYearId || availableTerms.length === 0}
              >
                <SelectTrigger id="term" className="bg-background/50">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {availableTerms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>
            {selectedYearId && availableTerms.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                No terms available for this academic year. Please create a term
                first.
              </p>
            )}
          </Field>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">Impact:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Students will see data from this year and term</li>
              <li>Teachers will see their classes for this period</li>
              <li>Staff will see relevant data for this period</li>
              <li>Admins can still switch to other periods in their session</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isUpdating}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating || !selectedYearId || !selectedTermId}
            className="flex-1"
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
