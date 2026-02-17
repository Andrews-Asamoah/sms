// components/admin/academic-years/academic-year-dialog.tsx
"use client";

import { useState, ReactNode, useEffect } from "react";
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
import { Loader2, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  organizationId: string;
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
  organizationId,
  children,
  initialData,
}: AcademicYearDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || "",
    startDate: initialData
      ? new Date(initialData.startDate).toISOString().split("T")[0]
      : "",
    endDate: initialData
      ? new Date(initialData.endDate).toISOString().split("T")[0]
      : "",
  });

  // Generate suggested academic year name based on dates
  const generateYearName = (start: string, end: string): string => {
    if (!start || !end) return "";
    const startYear = new Date(start).getFullYear();
    const endYear = new Date(end).getFullYear();
    return `${startYear}/${endYear}`;
  };

  // Auto-suggest name when dates change (only if name is empty)
  useEffect(() => {
    if (
      !initialData &&
      !formData.name &&
      formData.startDate &&
      formData.endDate
    ) {
      const suggested = generateYearName(formData.startDate, formData.endDate);
      if (suggested) {
        setFormData((prev) => ({ ...prev, name: suggested }));
      }
    }
  }, [formData.startDate, formData.endDate, formData.name, initialData]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Academic year name is required";
    } else if (formData.name.trim().length < 4) {
      newErrors.name = "Name should be at least 4 characters";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Name should not exceed 50 characters";
    }

    // Start date validation
    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    // End date validation
    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }

    // Date relationship validation
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);

      if (start >= end) {
        newErrors.endDate = "End date must be after start date";
      }

      // Validate reasonable academic year duration (minimum 3 months, maximum 18 months)
      const diffInMonths =
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (diffInMonths < 3) {
        newErrors.endDate = "Academic year must be at least 3 months long";
      } else if (diffInMonths > 18) {
        newErrors.endDate = "Academic year should not exceed 18 months";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      startDate: true,
      endDate: true,
    });

    if (!validateForm()) {
      toast.error("Validation Failed", {
        description: "Please fix the errors in the form",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        schoolId,
        organizationId,
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save academic year");
      }

      toast.success(
        initialData ? "Academic Year Updated" : "Academic Year Created",
        {
          description: initialData
            ? `${formData.name} has been updated successfully.`
            : `${formData.name} has been created successfully.`,
          icon: <CheckCircle2 className="h-4 w-4" />,
        },
      );

      setOpen(false);
      router.refresh();

      // Reset form if creating new
      if (!initialData) {
        setFormData({
          name: "",
          startDate: "",
          endDate: "",
        });
        setTouched({});
        setErrors({});
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";

      toast.error("Error", {
        description: errorMessage,
        icon: <AlertCircle className="h-4 w-4" />,
      });

      setErrors({
        general: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      // Reset form when closing
      if (!initialData) {
        setFormData({
          name: "",
          startDate: "",
          endDate: "",
        });
        setTouched({});
        setErrors({});
      }
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="border-0 bg-card/95 backdrop-blur-xl sm:max-w-[550px]">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">
                {initialData ? "Edit Academic Year" : "Create Academic Year"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {initialData
                  ? "Update the academic year details below"
                  : "Define a new academic year for your school"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {errors.general && (
            <Alert variant="destructive" className="animate-in fade-in-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <Field>
            <FieldLabel htmlFor="name">
              Academic Year Name <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldGroup>
              <Input
                id="name"
                placeholder="e.g., 2024/2025 or Fall 2024 - Spring 2025"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="bg-background/50"
                disabled={isSubmitting}
              />
            </FieldGroup>
            {errors.name && touched.name && (
              <FieldError className="animate-in fade-in-50">
                {errors.name}
              </FieldError>
            )}
            <p className="text-sm text-muted-foreground mt-1.5">
              A descriptive name for the academic year (automatically suggested
              from dates)
            </p>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
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
                  disabled={isSubmitting}
                />
              </FieldGroup>
              {errors.startDate && touched.startDate && (
                <FieldError className="animate-in fade-in-50">
                  {errors.startDate}
                </FieldError>
              )}
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
                  disabled={isSubmitting}
                  min={formData.startDate || undefined}
                />
              </FieldGroup>
              {errors.endDate && touched.endDate && (
                <FieldError className="animate-in fade-in-50">
                  {errors.endDate}
                </FieldError>
              )}
            </Field>
          </div>

          {formData.startDate && formData.endDate && !errors.endDate && (
            <Alert className="animate-in fade-in-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Duration:{" "}
                {Math.round(
                  (new Date(formData.endDate).getTime() -
                    new Date(formData.startDate).getTime()) /
                    (1000 * 60 * 60 * 24 * 30),
                )}{" "}
                months
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialData ? "Update Academic Year" : "Create Academic Year"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
