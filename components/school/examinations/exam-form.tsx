"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export enum AssessmentType {
  FINAL_EXAM = "FINAL_EXAM",
  MID_TERM_EXAM = "MID_TERM_EXAM",
  CLASS_TEST = "CLASS_TEST",
  QUIZ = "QUIZ",
  ASSIGNMENT = "ASSIGNMENT",
  PROJECT = "PROJECT",
  PRACTICAL = "PRACTICAL",
  HOMEWORK = "HOMEWORK",
  PRESENTATION = "PRESENTATION",
  MOCK_EXAM = "MOCK_EXAM",
}

const componentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  componentType: z.nativeEnum(AssessmentType),
  maxMarks: z.coerce.number().min(1, "Max marks must be at least 1"),
  weight: z.coerce.number().min(0).max(100, "Weight must be between 0 and 100"),
  isRepeatable: z.boolean().default(false),
  expectedCount: z.coerce.number().min(1).default(1),
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gradingSystemId: z.string().min(1, "Grading system is required"),
  classId: z.string().nullable().optional(),
  termNumber: z.coerce.number().int().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
  components: z.array(componentSchema).min(1, "At least one component is required"),
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
    control,
    reset,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: exam?.name || "",
      gradingSystemId: exam?.gradingSystemId || "",
      classId: exam?.classId || "",
      termNumber: exam?.termNumber || undefined,
      description: exam?.description || "",
      isActive: exam?.isActive ?? true,
      components: exam?.components?.map((c: any) => ({
        id: c.id,
        name: c.name,
        componentType: c.componentType,
        maxMarks: Number(c.maxMarks),
        weight: Number(c.weight),
        isRepeatable: c.isRepeatable ?? false,
        expectedCount: c.expectedCount ?? 1,
      })) || [
        {
          name: "Main Exam",
          componentType: AssessmentType.FINAL_EXAM,
          maxMarks: 100,
          weight: 100,
          isRepeatable: false,
          expectedCount: 1,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "components",
  });

  // Calculate total weight
  const watchComponents = watch("components");
  const totalWeight = watchComponents.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!isWeightValid) {
      toast.error(`Total weight must be 100%. Current: ${totalWeight}%`);
      return;
    }

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <FieldGroup>
            <FieldLabel htmlFor="name">Examination Name</FieldLabel>
            <Input
              id="name"
              placeholder="e.g. End of Term Examination"
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
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="termNumber">Term Number</FieldLabel>
              <Input
                id="termNumber"
                type="number"
                placeholder="1"
                {...register("termNumber")}
              />
            </FieldGroup>
          </div>

          <FieldGroup>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              placeholder="Details about the exam..."
              {...register("description")}
              className="resize-none h-20"
            />
          </FieldGroup>

          <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="isActive" className="text-sm font-semibold">Active Status</Label>
              <p className="text-xs text-muted-foreground">
                Visible to teachers for mark entry
              </p>
            </div>
            <Switch
              id="isActive"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
          </div>
        </div>

        {/* Component Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-muted/20 p-3 rounded-t-lg border border-b-0">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Components</h3>
            <div className={`text-xs font-bold px-2 py-1 rounded ${isWeightValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {totalWeight}% Weight
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto p-1">
            {fields.map((field: any, index: number) => {
              const isRepeatable = watch(`components.${index}.isRepeatable`);
              return (
                <div key={field.id} className="relative p-4 border rounded-lg bg-background shadow-sm space-y-3 group">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup>
                      <FieldLabel className="text-[10px] uppercase text-muted-foreground">Component Name</FieldLabel>
                      <Input 
                        placeholder="e.g. Section A" 
                        {...register(`components.${index}.name`)} 
                        className="h-8 text-sm"
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel className="text-[10px] uppercase text-muted-foreground">Type</FieldLabel>
                      <Select
                        value={watch(`components.${index}.componentType`)}
                        onValueChange={(v) => setValue(`components.${index}.componentType`, v as AssessmentType)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(AssessmentType).map((type) => (
                            <SelectItem key={type} value={type} className="text-xs">
                              {type.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-muted/30 p-2 rounded border">
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                         <Label className="text-[10px] uppercase">Max</Label>
                         <Input 
                            type="number" 
                            {...register(`components.${index}.maxMarks`)} 
                            className="h-7 text-xs bg-background"
                         />
                      </div>
                      <div className="flex-1">
                         <Label className="text-[10px] uppercase">Weight</Label>
                         <Input 
                            type="number" 
                            {...register(`components.${index}.weight`)} 
                            className="h-7 text-xs bg-background"
                         />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                       <div className="flex items-center space-x-1 h-7">
                          <Checkbox 
                            id={`rep-${index}`} 
                            checked={isRepeatable} 
                            onCheckedChange={(c) => setValue(`components.${index}.isRepeatable`, !!c)} 
                          />
                          <Label htmlFor={`rep-${index}`} className="text-[10px] cursor-pointer">Repeat</Label>
                       </div>
                       {isRepeatable && (
                          <div className="flex-1">
                            <Input 
                              type="number" 
                              placeholder="#"
                              {...register(`components.${index}.expectedCount`)} 
                              className="h-7 text-xs bg-background"
                            />
                          </div>
                       )}
                    </div>
                  </div>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed py-6"
              onClick={() => append({
                name: "New Section",
                componentType: AssessmentType.FINAL_EXAM,
                maxMarks: 100,
                weight: 0,
                isRepeatable: false,
                expectedCount: 1,
              })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Exam Component
            </Button>
          </div>
          
          {!isWeightValid && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
              <AlertCircle className="h-4 w-4" />
              <span>Total weight must sum up to exactly 100% to save.</span>
            </div>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isLoading || !isWeightValid} className="w-full h-12 text-lg">
        {isLoading ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</>
        ) : (
          exam ? "Update Examination" : "Create Examination"
        )}
      </Button>
    </form>
  );
}
