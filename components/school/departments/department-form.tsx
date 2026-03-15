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
  promotionPassMark: z.string().optional(),
  isActive: z.boolean(),
});

interface DepartmentFormProps {
  schoolSlug: string;
  department?: any;
  onSuccess?: () => void;
}

export function DepartmentForm({
  schoolSlug,
  department,
  onSuccess,
}: DepartmentFormProps) {
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
      name: department?.name || "",
      code: department?.code || "",
      description: department?.description || "",
      promotionPassMark: department?.promotionPassMark?.toString() || "",
      isActive: department?.isActive ?? true,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const url = department
        ? `/api/schools/${schoolSlug}/departments/${department.id}`
        : `/api/schools/${schoolSlug}/departments`;

      const method = department ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          promotionPassMark: values.promotionPassMark
            ? parseFloat(values.promotionPassMark)
            : null,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Something went wrong");
      }

      toast.success(
        `Department ${department ? "updated" : "created"} successfully`,
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
        <Input id="name" placeholder="Upper Primary" {...register("name")} />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </FieldGroup>

      <FieldGroup className="space-y-1">
        <FieldLabel htmlFor="code">Code</FieldLabel>
        <Input id="code" placeholder="UP" {...register("code")} />
        <p className="text-sm text-muted-foreground text-[0.8rem]">
          unique code for the department (max 10 characters).
        </p>
        {errors.code && <FieldError>{errors.code.message}</FieldError>}
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          placeholder="This is the Upper Primary Department..."
          {...register("description")}
        />
        {errors.description && (
          <FieldError>{errors.description.message}</FieldError>
        )}
      </FieldGroup>

      <FieldGroup className="space-y-1">
        <FieldLabel htmlFor="promotionPassMark">Promotion Pass Mark</FieldLabel>
        <Input
          id="promotionPassMark"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 500"
          {...register("promotionPassMark")}
        />
        <p className="text-sm text-muted-foreground text-[0.8rem]">
          Minimum raw score required for promotion. Set based on the total marks
          across all subjects in this department (e.g. 10 subjects × 100 =
          1000).
        </p>
        {errors.promotionPassMark && (
          <FieldError>{errors.promotionPassMark.message}</FieldError>
        )}
      </FieldGroup>

      <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">Active Status</Label>
          <p className="text-sm text-muted-foreground">
            Inactive departments will be hidden from some selections.
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
          : department
            ? "Update Department"
            : "Create Department"}
      </Button>
    </form>
  );
}
