"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const termSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type TemplateFormValues = z.infer<typeof termSchema>;

interface ReportCardTemplateFormProps {
  schoolSlug: string;
  onSuccess?: () => void;
}

export function ReportCardTemplateForm({
  schoolSlug,
  onSuccess,
}: ReportCardTemplateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(termSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const isActive = watch("isActive");

  const onSubmit: SubmitHandler<TemplateFormValues> = async (values) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/schools/${schoolSlug}/report-cards/templates`,
        {
          method: "POST",
          body: JSON.stringify({
            ...values,
            layout: {
              sections: [
                { type: "header", title: "Student Information" },
                { type: "academic", title: "Academic Performance" },
                { type: "attendance", title: "Attendance & Conduct" },
                { type: "remarks", title: "General Remarks" },
              ],
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to create template");
      }

      toast.success("Template created successfully");
      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="tpl-name">Template Name</FieldLabel>
          <Input
            id="tpl-name"
            placeholder="e.g., Standard Terminal Report"
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="tpl-desc">Description</FieldLabel>
          <Textarea
            id="tpl-desc"
            placeholder="Optional description of this template..."
            className="resize-none"
            {...register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Field orientation="horizontal" className="justify-between items-center rounded-lg border p-4">
          <div className="space-y-0.5">
            <FieldLabel className="text-base">Active Status</FieldLabel>
            <FieldDescription>
              Determine if this template can be used for new report sets.
            </FieldDescription>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={(val) => setValue("isActive", val)}
          />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" type="button" onClick={() => onSuccess?.()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Template
        </Button>
      </div>
    </form>
  );
}
