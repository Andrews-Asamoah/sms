// components/admin/academic-years/term-dialog.tsx
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
import {
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

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
  academicYearStartDate: Date;
  academicYearEndDate: Date;
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
  academicYearStartDate,
  academicYearEndDate,
  schoolSlug,
  existingTerms,
  children,
  initialData,
}: TermDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const nextTermNumber = initialData
    ? initialData.termNumber
    : Math.max(0, ...existingTerms.map((t) => t.termNumber)) + 1;

  // Helper to safely format date for input field
  const formatDateForInput = (date: Date | string): string => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) {
        return "";
      }
      return dateObj.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

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

  // Calculate term duration in weeks
  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const diffInDays =
      (new Date(end).getTime() - new Date(start).getTime()) /
      (1000 * 60 * 60 * 24);
    return Math.round(diffInDays / 7);
  };

  // Auto-update term name when term number changes
  useEffect(() => {
    if (!initialData && touched.termNumber) {
      const number = parseInt(formData.termNumber);
      if (!isNaN(number) && number > 0) {
        setFormData((prev) => ({
          ...prev,
          name: `Term ${number}`,
        }));
      }
    }
  }, [formData.termNumber, initialData, touched.termNumber]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Term name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name should be at least 2 characters";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Name should not exceed 50 characters";
    }

    // Term number validation
    if (!formData.termNumber) {
      newErrors.termNumber = "Term number is required";
    } else {
      const termNum = parseInt(formData.termNumber);
      if (isNaN(termNum) || termNum < 1) {
        newErrors.termNumber = "Term number must be a positive number";
      } else if (termNum > 20) {
        newErrors.termNumber = "Term number seems unusually high (max: 20)";
      }

      // Check for duplicate term number
      const duplicate = existingTerms.find(
        (t) =>
          t.termNumber === termNum && (!initialData || t.id !== initialData.id),
      );
      if (duplicate) {
        newErrors.termNumber = `Term ${termNum} already exists in this academic year`;
      }
    }

    // Start date validation
    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    } else {
      const startDate = new Date(formData.startDate);
      const yearStart = new Date(academicYearStartDate);
      const yearEnd = new Date(academicYearEndDate);

      if (startDate < yearStart) {
        newErrors.startDate = `Start date must be after academic year start (${yearStart.toLocaleDateString()})`;
      } else if (startDate > yearEnd) {
        newErrors.startDate = `Start date must be before academic year end (${yearEnd.toLocaleDateString()})`;
      }
    }

    // End date validation
    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    } else {
      const endDate = new Date(formData.endDate);
      const yearEnd = new Date(academicYearEndDate);

      if (endDate > yearEnd) {
        newErrors.endDate = `End date must be before academic year end (${yearEnd.toLocaleDateString()})`;
      }
    }

    // Date relationship validation
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);

      if (start >= end) {
        newErrors.endDate = "End date must be after start date";
      }

      // Validate reasonable term duration (minimum 4 weeks, maximum 20 weeks)
      const weeks = calculateDuration(formData.startDate, formData.endDate);
      if (weeks < 4) {
        newErrors.endDate = "Term should be at least 4 weeks long";
      } else if (weeks > 20) {
        newErrors.endDate =
          "Term should not exceed 20 weeks (consider splitting)";
      }

      // Check for overlapping terms
      const overlap = existingTerms.find((term) => {
        if (initialData && term.id === initialData.id) return false;

        const termStart = new Date(term.startDate);
        const termEnd = new Date(term.endDate);

        return (
          (start >= termStart && start <= termEnd) ||
          (end >= termStart && end <= termEnd) ||
          (start <= termStart && end >= termEnd)
        );
      });

      if (overlap) {
        newErrors.startDate = `Dates overlap with ${overlap.name}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setTouched({
      name: true,
      termNumber: true,
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save term");
      }

      toast.success(initialData ? "Term Updated" : "Term Created", {
        description: initialData
          ? `${formData.name} has been updated successfully.`
          : `${formData.name} has been created for ${academicYearName}.`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      });

      setOpen(false);
      router.refresh();

      // Reset form if creating new
      if (!initialData) {
        const newNextNum = nextTermNumber + 1;
        setFormData({
          name: `Term ${newNextNum}`,
          termNumber: newNextNum.toString(),
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
      if (!initialData) {
        const newNextNum = nextTermNumber;
        setFormData({
          name: `Term ${newNextNum}`,
          termNumber: newNextNum.toString(),
          startDate: "",
          endDate: "",
        });
        setTouched({});
        setErrors({});
      }
    }
    setOpen(newOpen);
  };

  const duration = calculateDuration(formData.startDate, formData.endDate);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="border-0 bg-card/95 backdrop-blur-xl sm:max-w-[550px]">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl">
                {initialData ? "Edit Term" : "Create Term"}
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2">
                {initialData
                  ? `Update term details for ${academicYearName}`
                  : `Add a new term to ${academicYearName}`}
              </DialogDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {existingTerms.length} term{existingTerms.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {errors.general && (
            <Alert variant="destructive" className="animate-in fade-in-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">
                Term Name <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldGroup>
                <Input
                  id="name"
                  placeholder="e.g., Term 1, First Term, Fall Term"
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
                  max="20"
                  placeholder="e.g., 1, 2, 3"
                  value={formData.termNumber}
                  onChange={(e) => handleChange("termNumber", e.target.value)}
                  className="bg-background/50"
                  disabled={isSubmitting}
                />
              </FieldGroup>
              {errors.termNumber && touched.termNumber && (
                <FieldError className="animate-in fade-in-50">
                  {errors.termNumber}
                </FieldError>
              )}
              <p className="text-sm text-muted-foreground mt-1.5">
                Used for ordering terms
              </p>
            </Field>
          </div>

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
                  min={formatDateForInput(academicYearStartDate)}
                  max={formatDateForInput(academicYearEndDate)}
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
                  min={
                    formData.startDate ||
                    formatDateForInput(academicYearStartDate)
                  }
                  max={formatDateForInput(academicYearEndDate)}
                />
              </FieldGroup>
              {errors.endDate && touched.endDate && (
                <FieldError className="animate-in fade-in-50">
                  {errors.endDate}
                </FieldError>
              )}
            </Field>
          </div>

          {duration > 0 && !errors.endDate && !errors.startDate && (
            <Alert className="animate-in fade-in-50">
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Duration: <strong>{duration} weeks</strong>
                </span>
                {duration >= 12 && duration <= 14 && (
                  <Badge variant="secondary" className="text-xs">
                    Standard term length
                  </Badge>
                )}
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
              {initialData ? "Update Term" : "Create Term"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
