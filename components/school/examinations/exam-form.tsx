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

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gradingSystemId: z.string().min(1, "Grading system is required"),
  classId: z.string().nullable().optional(),
  termNumber: z.coerce.number().int().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

interface ExamFormProps {
  schoolSlug: string;
  exam?: any;
  onSuccess?: () => void;
  gradingSystems: Array<{ id: string; name: string }>;
  classes: Array<{ id: string; name: string }>;
}

export function ExamForm({
  schoolSlug,
  exam,
  onSuccess,
  gradingSystems,
  classes,
}: ExamFormProps) {
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
      name: exam?.name || "",
      gradingSystemId: exam?.gradingSystemId || "",
      classId: exam?.classId || "",
      termNumber: exam?.termNumber || undefined,
      description: exam?.description || "",
      isActive: exam?.isActive ?? true,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const url = exam
        ? `/api/schools/${schoolSlug}/examinations/${exam.id}`
        : `/api/schools/${schoolSlug}/examinations`;

      const method = exam ? "PATCH" : "POST";

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

      toast.success(`Examination ${exam ? "updated" : "created"} successfully`);

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
          placeholder="Mid-Term Examination"
          {...register("name")}
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor="gradingSystemId">Grading System</FieldLabel>
        <Select
          value={watch("gradingSystemId")}
          onValueChange={(value) => setValue("gradingSystemId", value)}
        >
          <SelectTrigger id="gradingSystemId">
            <SelectValue placeholder="Select grading system" />
          </SelectTrigger>
          <SelectContent>
            {gradingSystems.map((gs) => (
              <SelectItem key={gs.id} value={gs.id}>
                {gs.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.gradingSystemId && (
          <FieldError>{errors.gradingSystemId.message}</FieldError>
        )}
      </FieldGroup>

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup>
          <FieldLabel htmlFor="classId">Target Class (Optional)</FieldLabel>
          <Select
            value={watch("classId") || "none"}
            onValueChange={(value) =>
              setValue("classId", value === "none" ? null : value)
            }
          >
            <SelectTrigger id="classId">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.classId && <FieldError>{errors.classId.message}</FieldError>}
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="termNumber">Term Number</FieldLabel>
          <Input
            id="termNumber"
            type="number"
            placeholder="1"
            {...register("termNumber")}
          />
          <p className="text-sm text-muted-foreground">Optional</p>
          {errors.termNumber && (
            <FieldError>{errors.termNumber.message}</FieldError>
          )}
        </FieldGroup>
      </div>

      <FieldGroup>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          placeholder="Examination details..."
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
            Inactive examinations will be hidden.
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
          : exam
            ? "Update Examination"
            : "Create Examination"}
      </Button>
    </form>
  );
}
