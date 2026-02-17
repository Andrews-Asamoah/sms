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
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  isSchoolDefault: z.boolean(),
  isActive: z.boolean(),
});

interface GradingSystemFormProps {
  schoolSlug: string;
  gradingSystem?: any;
  onSuccess?: () => void;
}

export function GradingSystemForm({
  schoolSlug,
  gradingSystem,
  onSuccess,
}: GradingSystemFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: gradingSystem?.name || "",
      code: gradingSystem?.code || "",
      description: gradingSystem?.description || "",
      isSchoolDefault: gradingSystem?.isSchoolDefault ?? false,
      isActive: gradingSystem?.isActive ?? true,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const url = gradingSystem
        ? `/api/schools/${schoolSlug}/grading/${gradingSystem.id}`
        : `/api/schools/${schoolSlug}/grading`;

      const method = gradingSystem ? "PATCH" : "POST";

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

      toast.success(
        `Grading system ${gradingSystem ? "updated" : "created"} successfully`,
      );

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
          placeholder="Standard WAEC Grading"
          {...register("name")}
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor="code">Code</FieldLabel>
        <Input id="code" placeholder="WAEC-STD" {...register("code")} />
        <p className="text-sm text-muted-foreground">
          Unique code for the grading system (max 10 characters).
        </p>
        {errors.code && <FieldError>{errors.code.message}</FieldError>}
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          placeholder="Standard WAEC grading system..."
          {...register("description")}
        />
        {errors.description && (
          <FieldError>{errors.description.message}</FieldError>
        )}
      </FieldGroup>

      <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5">
          <Label htmlFor="isSchoolDefault">Set as Default</Label>
          <p className="text-sm text-muted-foreground">
            This will be the default grading system for new assessments.
          </p>
        </div>
        <Switch
          id="isSchoolDefault"
          checked={watch("isSchoolDefault")}
          onCheckedChange={(checked) => setValue("isSchoolDefault", checked)}
        />
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">Active Status</Label>
          <p className="text-sm text-muted-foreground">
            Inactive systems will be hidden from selections.
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
          : gradingSystem
            ? "Update System"
            : "Create System"}
      </Button>
    </form>
  );
}
