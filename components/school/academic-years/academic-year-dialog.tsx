// components/admin/academic-years/academic-year-dialog.tsx
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

interface AcademicYear {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
}

interface AcademicYearDialogProps {
  schoolId: string;
  schoolSlug: string;
  children: ReactNode;
  initialData?: AcademicYear;
}

interface FormData {
  name: string;
  startDate: string;
  endDate: string;
}

interface FormErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  general?: string;
}

export function AcademicYearDialog({
  schoolId,
  schoolSlug,
  children,
  initialData,
}: AcademicYearDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || "",
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
      newErrors.name = "Academic year name is required";
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
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        schoolId,
      };

      const url = initialData
        ? `/api/schools/${schoolSlug}/academic-years/${initialData.id}`
        : `/api/schools/${schoolSlug}/academic-years`;

      const method = initialData ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save academic year");
      }

      toast.success(
        initialData ? "Academic year updated" : "Academic year created",
        {
          description: initialData
            ? "The academic year has been updated successfully."
            : "The new academic year has been created successfully.",
        }
      );

      setOpen(false);
      router.refresh();

      // Reset form
      setFormData({
        name: "",
        startDate: "",
        endDate: "",
      });
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
      <DialogContent className="border-0 bg-card/95 backdrop-blur-xl sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Academic Year" : "Create Academic Year"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update the academic year details below"
              : "Add a new academic year to your school"}
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
              Academic Year Name <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldGroup>
              <Input
                id="name"
                placeholder="e.g., 2024/2025"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="bg-background/50"
              />
            </FieldGroup>
            {errors.name && <FieldError>{errors.name}</FieldError>}
            <p className="text-sm text-muted-foreground mt-1">
              The name of the academic year (e.g., 2024/2025)
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
