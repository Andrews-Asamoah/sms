"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type GradeScaleFormValues = {
  grade: string;
  description: string;
  minScore: number;
  maxScore: number;
};

type FormValues = {
  name: string;
  code: string;
  description?: string;
  isSchoolDefault: boolean;
  isActive: boolean;
  gradeScales: GradeScaleFormValues[];
};

const gradeScaleSchema = z
  .object({
    grade: z.string().min(1, "Grade is required"),
    description: z.string().min(1, "Description is required"),
    minScore: z
      .number()
      .min(0, "Minimum score cannot be less than 0")
      .max(100, "Maximum score cannot be more than 100"),
    maxScore: z
      .number()
      .min(0, "Minimum score cannot be less than 0")
      .max(100, "Maximum score cannot be more than 100"),
  })
  .refine((data) => data.maxScore >= data.minScore, {
    message: "Max score must be greater than or equal to min score",
    path: ["maxScore"],
  });

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  isSchoolDefault: z.boolean(),
  isActive: z.boolean(),
  gradeScales: z
    .array(gradeScaleSchema)
    .min(1, "At least one grade is required"),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: gradingSystem?.name || "",
      code: gradingSystem?.code || "",
      description: gradingSystem?.description || "",
      isSchoolDefault: gradingSystem?.isSchoolDefault ?? false,
      isActive: gradingSystem?.isActive ?? true,
      gradeScales: gradingSystem?.gradeScales?.map((gs: any) => ({
        grade: gs.grade,
        description: gs.description,
        minScore: Number(gs.minScore),
        maxScore: Number(gs.maxScore),
      })) || [
        {
          grade: "1",
          description: "Highest",
          minScore: 80,
          maxScore: 100,
        },
      ],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "gradeScales",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = form;

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      // Add displayOrder based on index
      const payload = {
        ...values,
        gradeScales: values.gradeScales.map((gs, index) => ({
          ...gs,
          gradePoint: 0, // Default 0 as requested to remove GP essence
          displayOrder: index,
        })),
      };

      const url = gradingSystem
        ? `/api/schools/${schoolSlug}/grading/${gradingSystem.id}`
        : `/api/schools/${schoolSlug}/grading`;

      const method = gradingSystem ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FieldGroup>
          <FieldLabel htmlFor="name">System Name</FieldLabel>
          <Input
            id="name"
            className="h-11"
            placeholder="Standard BECE Grading"
            {...register("name")}
          />
          {errors.name && <FieldError>{errors.name.message}</FieldError>}
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="code">System Code</FieldLabel>
          <Input
            id="code"
            className="h-11"
            placeholder="BECE-123"
            {...register("code")}
          />
          {errors.code && <FieldError>{errors.code.message}</FieldError>}
        </FieldGroup>
      </div>

      <FieldGroup>
        <FieldLabel htmlFor="description">Detailed Description</FieldLabel>
        <Textarea
          id="description"
          className="min-h-[100px]"
          placeholder="Detailed description of this grading system..."
          {...register("description")}
        />
        {errors.description && (
          <FieldError>{errors.description.message}</FieldError>
        )}
      </FieldGroup>

      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <FieldLabel className="text-xl">Grade Scales</FieldLabel>
            <p className="text-sm text-muted-foreground mt-1">
              Configure individual grades and their score ranges
            </p>
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="shadow-sm"
            onClick={() =>
              append({
                grade: "",
                description: "",
                minScore: 0,
                maxScore: 0,
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Grade
          </Button>
        </div>

        <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 border-b">
                <TableRow>
                  <TableHead className="w-[100px] font-bold">Grade</TableHead>
                  <TableHead className="min-w-[250px] font-bold">
                    Description
                  </TableHead>
                  <TableHead className="w-[120px] font-bold text-center">
                    Min Score (%)
                  </TableHead>
                  <TableHead className="w-[120px] font-bold text-center">
                    Max Score (%)
                  </TableHead>
                  <TableHead className="w-[120px] text-right font-bold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow
                    key={field.id}
                    className="group hover:bg-muted/20 transition-colors"
                  >
                    <TableCell className="p-3">
                      <Input
                        className="h-10 px-3 font-semibold text-center border-primary/20 focus:border-primary"
                        {...register(`gradeScales.${index}.grade` as const)}
                        placeholder="1"
                      />
                    </TableCell>
                    <TableCell className="p-3">
                      <Input
                        className="h-10 px-3"
                        {...register(
                          `gradeScales.${index}.description` as const,
                        )}
                        placeholder="Excellent"
                      />
                    </TableCell>
                    <TableCell className="p-3">
                      <Input
                        type="number"
                        className="h-10 px-3 text-center"
                        {...register(`gradeScales.${index}.minScore` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                    <TableCell className="p-3">
                      <Input
                        type="number"
                        className="h-10 px-3 text-center"
                        {...register(`gradeScales.${index}.maxScore` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                    <TableCell className="p-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                          disabled={index === 0}
                          onClick={() => move(index, index - 1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                          disabled={index === fields.length - 1}
                          onClick={() => move(index, index + 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        {errors.gradeScales && (
          <p className="text-sm font-medium text-destructive flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-destructive" />
            {errors.gradeScales.message ||
              "Please add at least one grade scale."}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/20">
          <div className="space-y-0.5">
            <Label htmlFor="isSchoolDefault">School Default</Label>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              Primary system for new classes.
            </p>
          </div>
          <Switch
            id="isSchoolDefault"
            checked={watch("isSchoolDefault")}
            onCheckedChange={(checked) => setValue("isSchoolDefault", checked)}
          />
        </div>

        <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/20">
          <div className="space-y-0.5">
            <Label htmlFor="isActive">Active Status</Label>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              Enable for use in templates.
            </p>
          </div>
          <Switch
            id="isActive"
            checked={watch("isActive")}
            onCheckedChange={(checked) => setValue("isActive", checked)}
          />
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full h-11">
        {isLoading
          ? "Saving..."
          : gradingSystem
            ? "Update Grading System"
            : "Create Grading System"}
      </Button>
    </form>
  );
}
