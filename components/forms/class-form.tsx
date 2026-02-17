// components/forms/class-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Teacher {
  id: string;
  profile: {
    firstName: string;
    lastName: string;
  };
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface ClassFormProps {
  schoolId: string;
  schoolSlug: string;
  organizationId: string; // Added organizationId
  academicYears: AcademicYear[];
  teachers: Teacher[];
  initialData?: {
    id: string;
    name: string;
    level: string;
    section: string | null;
    capacity: number | null;
    academicYearId: string;
    classTeacherId: string | null;
    isActive: boolean;
  };
}

interface FormData {
  name: string;
  level: string;
  section: string;
  capacity: string;
  academicYearId: string;
  classTeacherId: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  level?: string;
  capacity?: string;
  academicYearId?: string;
  general?: string;
}

export function ClassForm({
  schoolId,
  schoolSlug,
  organizationId,
  academicYears,
  teachers,
  initialData,
}: ClassFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || "",
    level: initialData?.level || "",
    section: initialData?.section || "",
    capacity: initialData?.capacity?.toString() || "",
    academicYearId:
      initialData?.academicYearId ||
      academicYears.find((ay) => ay.isCurrent)?.id ||
      "",
    classTeacherId: initialData?.classTeacherId || "",
    isActive: initialData?.isActive ?? true,
  });

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Class name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Class name must be at least 2 characters";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Class name must not exceed 50 characters";
    }

    // Level validation
    if (!formData.level.trim()) {
      newErrors.level = "Level is required";
    } else if (formData.level.trim().length < 1) {
      newErrors.level = "Level must be at least 1 character";
    }

    // Academic year validation
    if (!formData.academicYearId) {
      newErrors.academicYearId = "Academic year is required";
    }

    // Capacity validation (optional but if provided must be valid)
    if (formData.capacity) {
      const capacityNum = parseInt(formData.capacity);
      if (isNaN(capacityNum) || capacityNum < 1) {
        newErrors.capacity = "Capacity must be a positive number";
      } else if (capacityNum > 500) {
        newErrors.capacity = "Capacity seems unusually high (max: 500)";
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
      level: true,
      capacity: true,
      academicYearId: true,
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
        level: formData.level.trim(),
        section: formData.section.trim() || null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        academicYearId: formData.academicYearId,
        classTeacherId: formData.classTeacherId || null,
        isActive: formData.isActive,
        schoolId,
        organizationId, // Include organizationId in payload
      };

      const url = initialData
        ? `/api/schools/${schoolSlug}/classes/${initialData.id}`
        : `/api/schools/${schoolSlug}/classes`;

      const method = initialData ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save class");
      }

      toast.success(initialData ? "Class Updated" : "Class Created", {
        description: initialData
          ? `${formData.name} has been updated successfully.`
          : `${formData.name} has been created successfully.`,
      });

      router.push(`/${schoolSlug}/admin/classes`);
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";

      toast.error("Error", {
        description: errorMessage,
      });

      setErrors({
        general: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <Alert variant="destructive" className="animate-in fade-in-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Class Name */}
        <Field>
          <FieldLabel htmlFor="name">
            Class Name <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldGroup>
            <Input
              id="name"
              placeholder="e.g., Form 1A, Grade 7B"
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
            The name of the class (e.g., Form 1A, Grade 7B)
          </p>
        </Field>

        {/* Level */}
        <Field>
          <FieldLabel htmlFor="level">
            Level <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldGroup>
            <Input
              id="level"
              placeholder="e.g., Form 1, Grade 7, JHS 1"
              value={formData.level}
              onChange={(e) => handleChange("level", e.target.value)}
              className="bg-background/50"
              disabled={isSubmitting}
            />
          </FieldGroup>
          {errors.level && touched.level && (
            <FieldError className="animate-in fade-in-50">
              {errors.level}
            </FieldError>
          )}
          <p className="text-sm text-muted-foreground mt-1.5">
            The grade or form level
          </p>
        </Field>

        {/* Section */}
        <Field>
          <FieldLabel htmlFor="section">Section (Optional)</FieldLabel>
          <FieldGroup>
            <Input
              id="section"
              placeholder="e.g., A, B, Science, Arts"
              value={formData.section}
              onChange={(e) => handleChange("section", e.target.value)}
              className="bg-background/50"
              disabled={isSubmitting}
            />
          </FieldGroup>
          <p className="text-sm text-muted-foreground mt-1.5">
            The section or stream (if applicable)
          </p>
        </Field>

        {/* Capacity */}
        <Field>
          <FieldLabel htmlFor="capacity">Capacity (Optional)</FieldLabel>
          <FieldGroup>
            <Input
              id="capacity"
              type="number"
              min="1"
              max="500"
              placeholder="e.g., 40"
              value={formData.capacity}
              onChange={(e) => handleChange("capacity", e.target.value)}
              className="bg-background/50"
              disabled={isSubmitting}
            />
          </FieldGroup>
          {errors.capacity && touched.capacity && (
            <FieldError className="animate-in fade-in-50">
              {errors.capacity}
            </FieldError>
          )}
          <p className="text-sm text-muted-foreground mt-1.5">
            Maximum number of students
          </p>
        </Field>

        {/* Academic Year */}
        <Field>
          <FieldLabel htmlFor="academicYearId">
            Academic Year <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldGroup>
            <Select
              value={formData.academicYearId}
              onValueChange={(value) => handleChange("academicYearId", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="academicYearId" className="bg-background/50">
                <SelectValue placeholder="Select academic year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name} {year.isCurrent && "✓ Current"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          {errors.academicYearId && touched.academicYearId && (
            <FieldError className="animate-in fade-in-50">
              {errors.academicYearId}
            </FieldError>
          )}
          <p className="text-sm text-muted-foreground mt-1.5">
            The academic year for this class
          </p>
        </Field>

        {/* Class Teacher */}
        <Field>
          <FieldLabel htmlFor="classTeacherId">
            Class Teacher (Optional)
          </FieldLabel>
          <FieldGroup>
            <Select
              value={formData.classTeacherId}
              onValueChange={(value) =>
                handleChange("classTeacherId", value === "none" ? "" : value)
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="classTeacherId" className="bg-background/50">
                <SelectValue placeholder="Select class teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.profile.firstName} {teacher.profile.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <p className="text-sm text-muted-foreground mt-1.5">
            Assign a class teacher (can be changed later)
          </p>
        </Field>
      </div>

      {/* Active Status */}
      <div className="flex items-center justify-between rounded-lg border bg-card/50 p-4">
        <div className="space-y-0.5">
          <FieldLabel htmlFor="isActive" className="text-base">
            Active Status
          </FieldLabel>
          <p className="text-sm text-muted-foreground">
            Active classes are available for student enrollment
          </p>
        </div>
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => handleChange("isActive", checked)}
          disabled={isSubmitting}
        />
      </div>

      {/* Info Alert */}
      {!initialData && (
        <Alert className="animate-in fade-in-50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            After creating the class, you can assign subjects and manage
            students from the class details page.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
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
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Class" : "Create Class"}
        </Button>
      </div>
    </form>
  );
}
