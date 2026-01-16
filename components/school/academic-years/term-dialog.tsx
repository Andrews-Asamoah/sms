// components/admin/academic-years/term-dialog.tsx
"use client";

import { useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

interface Term {
  id: string;
  name: string;
  termNumber: number;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
}

interface TermDialogProps {
  academicYearId: string;
  academicYearName: string;
  schoolSlug: string;
  existingTerms: Term[];
  children: ReactNode;
  initialData?: Term;
}

interface FormData {
  name: string;
  termNumber: string;
  startDate: string;
  endDate: string;
}

interface FormErrors {
  name?: string;
  termNumber?: string;
  startDate?: string;
  endDate?: string;
  general?: string;
}

export function TermDialog({
  academicYearId,
  academicYearName,
  schoolSlug,
  existingTerms,
  children,
  initialData,
}: TermDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const nextTermNumber = initialData
    ? initialData.termNumber
    : Math.max(0, ...existingTerms.map((t) => t.termNumber)) + 1;

  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || `Term ${nextTermNumber}`,
    termNumber: initialData?.termNumber.toString() || nextTermNumber.toString(),
    startDate: initialData
      ? new Date(initialData.startDate).toISOString().split("T")[0]
      : "",
    endDate: initialData
      ? new Date(initialData.endDate).toISOString().split("T")[0]
      : "",
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Term name is required";
    }

    if (!formData.termNumber) {
      newErrors.termNumber = "Term number is required";
    }

    const termNum = parseInt(formData.termNumber);
    if (isNaN(termNum) || termNum < 1) {
      newErrors.termNumber = "Term number must be a positive number";
    }

    // Check for duplicate term number (excluding current term if editing)
    const duplicate = existingTerms.find(
      (t) =>
        t.termNumber === termNum && (!initialData || t.id !== initialData.id)
    );
    if (duplicate) {
      newErrors.termNumber = `Term ${termNum} already exists`;
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        termNumber: parseInt(formData.termNumber),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        academicYearId,
      };

      const url = initialData
        ? `/api/schools/${schoolSlug}/terms/${initialData.id}`
        : `/api/schools/${schoolSlug}/terms`;

      const method = initialData ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save term");
      }

      toast.success(initialData ? "Term updated" : "Term created", {
        description: initialData
          ? "The term has been updated successfully."
          : "The new term has been created successfully.",
      });

      setOpen(false);
      router.refresh();

      // Reset form
      if (!initialData) {
        const newNextNum = nextTermNumber + 1;
        setFormData({
          name: `Term ${newNextNum}`,
          termNumber: newNextNum.toString(),
          startDate: "",
          endDate: "",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Something went wrong",
      });
      setErrors({
        general:
          error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="border-0 bg-card/95 backdrop-blur-xl sm:max-w-125">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Term" : "Create Term"}</DialogTitle>
          <DialogDescription>
            {initialData
              ? `Update term details for ${academicYearName}`
              : `Add a new term to ${academicYearName}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{errors.general}</p>
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="name">
              Term Name <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldGroup>
              <Input
                id="name"
                placeholder="e.g., Term 1, First Term"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="bg-background/50"
              />
            </FieldGroup>
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="termNumber">
              Term Number <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldGroup>
              <Input
                id="termNumber"
                type="number"
                min="1"
                placeholder="e.g., 1, 2, 3"
                value={formData.termNumber}
                onChange={(e) => handleChange("termNumber", e.target.value)}
                className="bg-background/50"
              />
            </FieldGroup>
            {errors.termNumber && <FieldError>{errors.termNumber}</FieldError>}
            <p className="text-sm text-muted-foreground mt-1">
              Used for ordering terms within the academic year
            </p>
          </Field>

          <Field>
            <FieldLabel htmlFor="startDate">
              Start Date <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldGroup>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
                className="bg-background/50"
              />
            </FieldGroup>
            {errors.startDate && <FieldError>{errors.startDate}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="endDate">
              End Date <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldGroup>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
                className="bg-background/50"
              />
            </FieldGroup>
            {errors.endDate && <FieldError>{errors.endDate}</FieldError>}
          </Field>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialData ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
