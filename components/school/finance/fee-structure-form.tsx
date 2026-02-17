"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FeeItem {
  name: string;
  amount: string;
}

interface FormData {
  name: string;
  description: string;
  classLevel: string;
  items: FeeItem[];
  targetClasses: string[];
  targetDepartments: string[];
}

interface FormErrors {
  name?: string;
  description?: string;
  items?: string;
  general?: string;
}

interface InitialData {
  id: string;
  name: string;
  description: string;
  classLevel: string;
  items: { id: string; name: string; amount: number }[];
}

interface FeeStructureFormProps {
  schoolSlug: string;
  classes: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  initialData?: InitialData | null;
  onSuccess?: () => void;
}

export function FeeStructureForm({
  schoolSlug,
  classes,
  departments,
  initialData,
  onSuccess,
}: FeeStructureFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    classLevel: initialData?.classLevel || "",
    items: initialData?.items.map((item) => ({
      name: item.name,
      amount: item.amount.toString(),
    })) || [{ name: "Tuition Fee", amount: "0" }],
    targetClasses: [],
    targetDepartments: [],
  });

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof FeeItem,
    value: string,
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    handleChange("items", newItems);
  };

  const addItem = () => {
    handleChange("items", [...formData.items, { name: "", amount: "0" }]);
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      handleChange("items", newItems);
    }
  };

  const toggleClass = (classId: string) => {
    const newClasses = formData.targetClasses.includes(classId)
      ? formData.targetClasses.filter((id) => id !== classId)
      : [...formData.targetClasses, classId];
    handleChange("targetClasses", newClasses);
  };

  const toggleDepartment = (deptId: string) => {
    const newDepts = formData.targetDepartments.includes(deptId)
      ? formData.targetDepartments.filter((id) => id !== deptId)
      : [...formData.targetDepartments, deptId];
    handleChange("targetDepartments", newDepts);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (formData.items.length === 0) {
      newErrors.items = "At least one fee item is required";
    } else {
      const hasInvalidItem = formData.items.some(
        (item) => !item.name.trim() || parseFloat(item.amount) < 0,
      );
      if (hasInvalidItem) {
        newErrors.items = "All items must have a name and positive amount";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      name: true,
      items: true,
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
        description: formData.description.trim() || undefined,
        classLevel: formData.classLevel.trim() || undefined,
        items: formData.items.map((item) => ({
          name: item.name.trim(),
          amount: parseFloat(item.amount),
        })),
        targetClasses:
          formData.targetClasses.length > 0
            ? formData.targetClasses
            : undefined,
        targetDepartments:
          formData.targetDepartments.length > 0
            ? formData.targetDepartments
            : undefined,
      };

      const url = initialData
        ? `/api/schools/${schoolSlug}/finance/fee-structures/${initialData.id}`
        : `/api/schools/${schoolSlug}/finance/fee-structures`;

      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(
          error.error ||
            `Failed to ${initialData ? "update" : "create"} fee structure`,
        );
      }

      toast.success("Success", {
        description: `Fee structure ${initialData ? "updated" : "created"} successfully.`,
      });

      router.refresh();
      if (onSuccess) onSuccess();
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <Alert variant="destructive" className="animate-in fade-in-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      <Field>
        <FieldLabel htmlFor="name">
          Name <span className="text-destructive">*</span>
        </FieldLabel>
        <FieldGroup>
          <Input
            id="name"
            placeholder="e.g. Term 1 2024 Fees"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
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
        <FieldLabel htmlFor="description">Description (Optional)</FieldLabel>
        <FieldGroup>
          <Input
            id="description"
            placeholder="Optional description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            disabled={isSubmitting}
          />
        </FieldGroup>
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">
            Fee Items <span className="text-destructive">*</span>
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={isSubmitting}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="space-y-2">
          {formData.items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Item Name"
                value={item.name}
                onChange={(e) =>
                  handleItemChange(index, "name", e.target.value)
                }
                disabled={isSubmitting}
                className="flex-1"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={item.amount}
                onChange={(e) =>
                  handleItemChange(index, "amount", e.target.value)
                }
                disabled={isSubmitting}
                className="w-[120px]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
                disabled={formData.items.length === 1 || isSubmitting}
              >
                <Trash className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
        {errors.items && touched.items && (
          <FieldError className="animate-in fade-in-50">
            {errors.items}
          </FieldError>
        )}
      </div>

      {!initialData && (
        <>
          <Separator />

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium">
                Bulk Assignment (Optional)
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Select classes or departments to automatically create bills for
                students
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-muted-foreground">
                  Target Classes
                </h5>
                <ScrollArea className="h-[140px] w-full rounded-md border p-3">
                  <div className="space-y-2">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex flex-row items-center space-x-2"
                      >
                        <Checkbox
                          id={`class-${cls.id}`}
                          checked={formData.targetClasses.includes(cls.id)}
                          onCheckedChange={() => toggleClass(cls.id)}
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor={`class-${cls.id}`}
                          className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {cls.name}
                        </label>
                      </div>
                    ))}
                    {classes.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No classes found.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-muted-foreground">
                  Target Departments
                </h5>
                <ScrollArea className="h-[140px] w-full rounded-md border p-3">
                  <div className="space-y-2">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="flex flex-row items-center space-x-2"
                      >
                        <Checkbox
                          id={`dept-${dept.id}`}
                          checked={formData.targetDepartments.includes(dept.id)}
                          onCheckedChange={() => toggleDepartment(dept.id)}
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor={`dept-${dept.id}`}
                          className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {dept.name}
                        </label>
                      </div>
                    ))}
                    {departments.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No departments found.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="pt-4 border-t">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting
            ? initialData
              ? "Updating..."
              : "Creating..."
            : initialData
              ? "Update Fee Structure"
              : "Create Fee Structure"}
        </Button>
      </div>
    </form>
  );
}
