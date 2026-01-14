// components/admin/classes/class-form.tsx
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

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
  academicYearId?: string;
  general?: string;
}

export function ClassForm({
  schoolId,
  schoolSlug,
  academicYears,
  teachers,
  initialData,
}: ClassFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

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
    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Class name is required";
    }

    if (!formData.level.trim()) {
      newErrors.level = "Level is required";
    }

    if (!formData.academicYearId) {
      newErrors.academicYearId = "Academic year is required";
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
        level: formData.level.trim(),
        section: formData.section.trim() || null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        academicYearId: formData.academicYearId,
        classTeacherId: formData.classTeacherId || null,
        isActive: formData.isActive,
        schoolId,
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

      toast.success(initialData ? "Class updated" : "Class created", {
        description: initialData
          ? "The class has been updated successfully."
          : "The new class has been created successfully.",
      });

      router.push(`/${schoolSlug}/admin/classes`);
      router.refresh();
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.general}
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="name">
            Class Name <span className="text-red-500">*</span>
          </FieldLabel>
          <FieldGroup>
            <Input
              id="name"
              placeholder="e.g., Form 1A"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="bg-white/50 dark:bg-slate-950/50"
            />
          </FieldGroup>
          {errors.name && <FieldError>{errors.name}</FieldError>}
          <p className="text-sm text-muted-foreground mt-1">
            The name of the class (e.g., Form 1A, Grade 7B)
          </p>
        </Field>

        <Field>
          <FieldLabel htmlFor="level">
            Level <span className="text-red-500">*</span>
          </FieldLabel>
          <FieldGroup>
            <Input
              id="level"
              placeholder="e.g., Form 1, Grade 7"
              value={formData.level}
              onChange={(e) => handleChange("level", e.target.value)}
              className="bg-white/50 dark:bg-slate-950/50"
            />
          </FieldGroup>
          {errors.level && <FieldError>{errors.level}</FieldError>}
          <p className="text-sm text-muted-foreground mt-1">
            The level or grade of the class
          </p>
        </Field>

        <Field>
          <FieldLabel htmlFor="section">Section (Optional)</FieldLabel>
          <FieldGroup>
            <Input
              id="section"
              placeholder="e.g., A, B, Science"
              value={formData.section}
              onChange={(e) => handleChange("section", e.target.value)}
              className="bg-white/50 dark:bg-slate-950/50"
            />
          </FieldGroup>
          <p className="text-sm text-muted-foreground mt-1">
            The section or stream of the class
          </p>
        </Field>

        <Field>
          <FieldLabel htmlFor="capacity">Capacity (Optional)</FieldLabel>
          <FieldGroup>
            <Input
              id="capacity"
              type="number"
              placeholder="e.g., 40"
              value={formData.capacity}
              onChange={(e) => handleChange("capacity", e.target.value)}
              className="bg-white/50 dark:bg-slate-950/50"
            />
          </FieldGroup>
          <p className="text-sm text-muted-foreground mt-1">
            Maximum number of students
          </p>
        </Field>

        <Field>
          <FieldLabel htmlFor="academicYearId">
            Academic Year <span className="text-red-500">*</span>
          </FieldLabel>
          <FieldGroup>
            <Select
              value={formData.academicYearId}
              onValueChange={(value) => handleChange("academicYearId", value)}
            >
              <SelectTrigger
                id="academicYearId"
                className="bg-white/50 dark:bg-slate-950/50"
              >
                <SelectValue placeholder="Select academic year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name} {year.isCurrent && "(Current)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          {errors.academicYearId && (
            <FieldError>{errors.academicYearId}</FieldError>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            The academic year for this class
          </p>
        </Field>

        <Field>
          <FieldLabel htmlFor="classTeacherId">
            Class Teacher (Optional)
          </FieldLabel>
          <FieldGroup>
            <Select
              value={formData.classTeacherId}
              onValueChange={(value) => handleChange("classTeacherId", value)}
            >
              <SelectTrigger
                id="classTeacherId"
                className="bg-white/50 dark:bg-slate-950/50"
              >
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
          <p className="text-sm text-muted-foreground mt-1">
            Assign a class teacher to this class
          </p>
        </Field>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 p-4">
        <div className="space-y-0.5">
          <FieldLabel htmlFor="isActive" className="text-base">
            Active Status
          </FieldLabel>
          <p className="text-sm text-muted-foreground">
            Make this class active and available for enrollment
          </p>
        </div>
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => handleChange("isActive", checked)}
        />
      </div>

      <div className="flex gap-4">
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
          className="flex-1 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Class" : "Create Class"}
        </Button>
      </div>
    </form>
  );
}
