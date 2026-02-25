"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  departmentIds: z.array(z.string()).min(1, "Select at least one department"),
  creditHours: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

interface SubjectFormProps {
  schoolSlug: string;
  subject?: any;
  onSuccess?: () => void;
  departments: Array<{ id: string; name: string }>;
}

export function SubjectForm({
  schoolSlug,
  subject,
  onSuccess,
  departments,
}: SubjectFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: subject?.name || "",
      code: subject?.code || "",
      description: subject?.description || "",
      departmentIds:
        subject?.departments?.map((d: any) => d.id) ||
        (subject?.departmentId ? [subject.departmentId] : []),
      creditHours: subject?.creditHours ?? 1,
      isActive: subject?.isActive ?? true,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const url = subject
        ? `/api/schools/${schoolSlug}/subjects/${subject.id}`
        : `/api/schools/${schoolSlug}/subjects`;

      const method = subject ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Something went wrong");
      }

      toast.success(`Subject ${subject ? "updated" : "created"} successfully`);

      router.refresh();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          placeholder="General Mathematics"
          {...register("name")}
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </FieldGroup>

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup>
          <FieldLabel htmlFor="code">Code</FieldLabel>
          <Input id="code" placeholder="MAT101" {...register("code")} />
          {errors.code && <FieldError>{errors.code.message}</FieldError>}
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="creditHours">Credit Hours</FieldLabel>
          <Input
            id="creditHours"
            type="number"
            min="0"
            {...register("creditHours")}
          />
          {errors.creditHours && (
            <FieldError>{errors.creditHours.message}</FieldError>
          )}
        </FieldGroup>
      </div>

      <FieldGroup>
        <FieldLabel>Departments</FieldLabel>
        <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/30">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="flex flex-row items-start space-x-3 space-y-0"
            >
              <Checkbox
                id={`dept-${dept.id}`}
                checked={watch("departmentIds")?.includes(dept.id)}
                onCheckedChange={(checked) => {
                  const currentDepts = watch("departmentIds") || [];
                  if (checked) {
                    setValue("departmentIds", [...currentDepts, dept.id]);
                  } else {
                    setValue(
                      "departmentIds",
                      currentDepts.filter((id) => id !== dept.id),
                    );
                  }
                }}
              />
              <Label
                htmlFor={`dept-${dept.id}`}
                className="text-sm font-normal cursor-pointer text-muted-foreground"
              >
                {dept.name}
              </Label>
            </div>
          ))}
        </div>
        {errors.departmentIds && (
          <FieldError>{errors.departmentIds.message}</FieldError>
        )}
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          placeholder="Course description..."
          {...register("description")}
        />
        {errors.description && (
          <FieldError>{errors.description.message}</FieldError>
        )}
      </FieldGroup>

      <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">Active Status</Label>
          <p className="text-sm text-muted-foreground">
            Inactive subjects will be hidden from assignment selections.
          </p>
        </div>
        <Switch
          id="isActive"
          checked={watch("isActive")}
          onCheckedChange={(checked) => setValue("isActive", checked)}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading
          ? "Saving..."
          : subject
            ? "Update Subject"
            : "Create Subject"}
      </Button>
    </form>
  );
}
