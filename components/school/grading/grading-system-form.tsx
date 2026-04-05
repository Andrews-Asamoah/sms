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
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const gradeScaleSchema = z
  .object({
    grade: z.string().min(1, "Grade is required"),
    description: z.string().min(1, "Description is required"),
    minScore: z
      .number()
      .min(0, "Min score must be >= 0")
      .max(100, "Min score must be <= 100"),
    maxScore: z
      .number()
      .min(0, "Max score must be >= 0")
      .max(100, "Max score must be <= 100"),
  })
  .refine((data) => data.maxScore >= data.minScore, {
    message: "Max score must be >= min score",
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

type FormValues = z.infer<typeof formSchema>;
type GradeScaleFormValues = z.infer<typeof gradeScaleSchema>;

const BECE_DEFAULT_GRADES: GradeScaleFormValues[] = [
  { grade: "1", description: "Excellent", minScore: 90, maxScore: 100 },
  { grade: "2", description: "Very good", minScore: 80, maxScore: 89 },
  { grade: "3", description: "Good", minScore: 70, maxScore: 79 },
  { grade: "4", description: "Credit", minScore: 60, maxScore: 69 },
  { grade: "5", description: "Credit", minScore: 55, maxScore: 59 },
  { grade: "6", description: "Pass", minScore: 50, maxScore: 54 },
  { grade: "7", description: "Pass", minScore: 40, maxScore: 49 },
  { grade: "8", description: "Weak pass", minScore: 35, maxScore: 39 },
  { grade: "9", description: "Very weak", minScore: 0, maxScore: 34 },
];

interface GradingSystemFormProps {
  id?: string;
  schoolSlug: string;
  gradingSystem?: any;
  onSuccess?: () => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function GradingSystemForm({
  id,
  schoolSlug,
  gradingSystem,
  onSuccess,
  onLoadingChange,
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
    onLoadingChange?.(true);
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
      onLoadingChange?.(false);
    }
  }

  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-4">
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
        <div className="flex flex-col gap-4 border-b pb-4">
          <div>
            <FieldLabel className="text-xl font-bold flex items-center gap-2">
              Grade Scales
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wider font-bold h-5"
              >
                Configuration
              </Badge>
            </FieldLabel>
            <p className="text-sm text-muted-foreground mt-1">
              Configure individual grades and their score ranges
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-4 shadow-sm border-primary/20 hover:border-primary hover:bg-primary/5 font-semibold transition-all duration-200"
              onClick={() => {
                setValue("name", "WAEC BECE Standard");
                setValue("code", "BECE");
                setValue(
                  "description",
                  "Ghana WAEC — Nine-point Stanine grading system (Grades 1-9)",
                );
                setValue("gradeScales", BECE_DEFAULT_GRADES);
                toast.success("BECE Standard Scale loaded!");
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Use BECE Standard (1-9)
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-9 px-4 shadow-sm font-semibold transition-all duration-200"
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
        </div>

        <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 border-b">
                <TableRow>
                  <TableHead className="w-[100px] font-bold">Grade</TableHead>
                  <TableHead className="min-w-[160px] font-bold">
                    Description
                  </TableHead>
                  <TableHead className="w-[320px] font-bold text-center">
                    Score Range (%)
                  </TableHead>
                  <TableHead className="w-[50px] text-right font-bold">
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
                        className="h-10 px-0 font-semibold text-center border-primary/20 focus:border-primary"
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
                      <div className="flex items-center justify-center gap-3">
                        <Input
                          type="number"
                          className="h-9 w-20 px-2 text-center border-primary/10 focus:border-primary/40"
                          {...register(
                            `gradeScales.${index}.minScore` as const,
                            {
                              valueAsNumber: true,
                            },
                          )}
                        />
                        <span className="text-muted-foreground text-xs font-medium">
                          to
                        </span>
                        <Input
                          type="number"
                          className="h-9 w-20 px-2 text-center border-primary/10 focus:border-primary/40"
                          {...register(
                            `gradeScales.${index}.maxScore` as const,
                            {
                              valueAsNumber: true,
                            },
                          )}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="p-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-muted"
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            disabled={index === 0}
                            onClick={() => move(index, index - 1)}
                            className="text-xs"
                          >
                            <ArrowUp className="mr-2 h-3.5 w-3.5" />
                            Move Up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={index === fields.length - 1}
                            onClick={() => move(index, index + 1)}
                            className="text-xs"
                          >
                            <ArrowDown className="mr-2 h-3.5 w-3.5" />
                            Move Down
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => remove(index)}
                            className="text-xs text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
    </form>
  );
}
