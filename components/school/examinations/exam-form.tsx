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
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, AlertCircle, Settings2, Network, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
          <TabsTrigger value="config" className="text-sm font-semibold gap-2">
            <Settings2 className="h-4 w-4" />
            General Configuration
          </TabsTrigger>
          <TabsTrigger value="structure" className="text-sm font-semibold gap-2">
            <Network className="h-4 w-4" />
            Assessment Structure
            {isWeightValid && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6 animate-in fade-in-50 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card p-6 rounded-xl border shadow-sm">
            <div className="space-y-4">
              <FieldGroup>
                <FieldLabel htmlFor="name" className="text-sm font-bold tracking-tight">Examination Name</FieldLabel>
                <Input
                  id="name"
                  placeholder="e.g. End of Term Examination"
                  {...register("name")}
                  className="h-11"
                />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="description" className="text-sm font-bold tracking-tight">Description</FieldLabel>
                <Textarea
                  id="description"
                  placeholder="Provide context or details about this examination..."
                  {...register("description")}
                  className="resize-none h-32 focus-visible:ring-primary/30"
                />
              </FieldGroup>
            </div>

            <div className="space-y-5">
              <FieldGroup>
                <FieldLabel htmlFor="gradingSystemId" className="text-sm font-bold tracking-tight">Grading System</FieldLabel>
                <Select
                  value={watch("gradingSystemId")}
                  onValueChange={(value) => setValue("gradingSystemId", value)}
                >
                  <SelectTrigger id="gradingSystemId" className="h-11">
                    <SelectValue placeholder="How will students be graded?" />
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
                  <FieldLabel htmlFor="classId" className="text-sm font-bold tracking-tight">Scope / Class</FieldLabel>
                  <Select
                    value={watch("classId") || "none"}
                    onValueChange={(value) =>
                      setValue("classId", value === "none" ? null : value)
                    }
                  >
                    <SelectTrigger id="classId" className="h-11">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Classes (Global)</SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="termNumber" className="text-sm font-bold tracking-tight">Term Number</FieldLabel>
                  <Input
                    id="termNumber"
                    type="number"
                    placeholder="1"
                    {...register("termNumber")}
                    className="h-11"
                  />
                </FieldGroup>
              </div>

              <div className="pt-2">
                <div className={cn(
                  "flex flex-row items-center justify-between rounded-xl border p-4 shadow-sm transition-colors",
                  watch("isActive") ? "bg-emerald-50/30 border-emerald-100" : "bg-muted/30"
                )}>
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive" className="text-base font-bold tracking-tight">Active Status</Label>
                    <p className="text-xs text-muted-foreground">
                      Should this be visible for mark entry?
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={watch("isActive")}
                    onCheckedChange={(checked) => setValue("isActive", checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="structure" className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          {/* Weight Indicator Header */}
          <div className={cn(
            "p-5 rounded-xl border-2 flex flex-col gap-3 transition-all",
            isWeightValid 
              ? "bg-emerald-50/50 border-emerald-500/20" 
              : "bg-red-50/50 border-red-500/20"
          )}>
            <div className="flex justify-between items-center px-1">
              <div className="space-y-1">
                <h3 className={cn(
                  "text-lg font-bold tracking-tight",
                  isWeightValid ? "text-emerald-700" : "text-red-700"
                )}>
                  Structure Weighting: {totalWeight.toFixed(0)}%
                </h3>
                <p className="text-xs text-muted-foreground">
                  The sum of all component weights must equal exactly 100%.
                </p>
              </div>
              {isWeightValid ? (
                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1">Valid Configuration</Badge>
              ) : (
                <Badge variant="destructive" className="px-3 py-1 animate-pulse">Needs Adjustment</Badge>
              )}
            </div>
            <Progress value={totalWeight} className={cn(
              "h-3 w-full",
              isWeightValid ? "[&>div]:bg-emerald-500" : "[&>div]:bg-red-500"
            )} />
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {fields.map((field: any, index: number) => {
              const isRepeatable = watch(`components.${index}.isRepeatable`);
              const componentType = watch(`components.${index}.componentType`);
              
              return (
                <Card key={field.id} className="relative group transition-all hover:shadow-md border-muted-foreground/10 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20" />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FieldGroup>
                            <FieldLabel className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Component Name</FieldLabel>
                            <Input 
                              placeholder="e.g. Mid-Term Test" 
                              {...register(`components.${index}.name`)} 
                              className="h-10 font-medium"
                            />
                          </FieldGroup>
                          <FieldGroup>
                            <FieldLabel className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Assessment Category</FieldLabel>
                            <Select
                              value={componentType}
                              onValueChange={(v) => setValue(`components.${index}.componentType`, v as AssessmentType)}
                            >
                              <SelectTrigger className="h-10 font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(AssessmentType).map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type.replace(/_/g, " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FieldGroup>
                        </div>
                      </div>
                      
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="h-10 w-10 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-full shrink-0 mt-6"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/20 p-5 rounded-xl border border-muted-foreground/5">
                      <FieldGroup>
                        <FieldLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Max Raw Score</FieldLabel>
                        <div className="relative">
                          <Input 
                            type="number" 
                            {...register(`components.${index}.maxMarks`)} 
                            className="h-10 bg-background font-mono pl-3"
                          />
                        </div>
                      </FieldGroup>

                      <FieldGroup>
                        <FieldLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Weight Toward Total (%)</FieldLabel>
                        <div className="relative">
                          <Input 
                            type="number" 
                            {...register(`components.${index}.weight`)} 
                            className="h-10 bg-background font-mono pl-3"
                          />
                          <span className="absolute right-3 top-2.5 text-muted-foreground font-mono">%</span>
                        </div>
                      </FieldGroup>

                      <div className="space-y-4">
                        <FieldLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Special Handling</FieldLabel>
                        <div className="flex items-center gap-6 h-10 px-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`rep-${index}`} 
                              checked={isRepeatable} 
                              onCheckedChange={(c) => setValue(`components.${index}.isRepeatable`, !!c)}
                              className="h-5 w-5 rounded-md"
                            />
                            <Label htmlFor={`rep-${index}`} className="text-xs font-medium cursor-pointer">Multiple Entries?</Label>
                          </div>
                          
                          {isRepeatable && (
                            <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">Qty:</span>
                              <Input 
                                type="number" 
                                placeholder="3"
                                {...register(`components.${index}.expectedCount`)} 
                                className="h-8 w-14 bg-background px-2 text-center text-xs"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-2 py-12 flex flex-col gap-3 group hover:border-primary/50 hover:bg-primary/5 transition-all rounded-xl"
              onClick={() => append({
                name: "New Section",
                componentType: AssessmentType.FINAL_EXAM,
                maxMarks: 100,
                weight: 100 - totalWeight > 0 ? 100 - totalWeight : 0,
                isRepeatable: false,
                expectedCount: 1,
              })}
            >
              <div className="bg-primary/10 p-3 rounded-full group-hover:scale-110 transition-transform">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <span className="block font-bold">Add Examination Component</span>
                <span className="text-xs text-muted-foreground tracking-tight italic">Inject Section A, Practical, Class Test, etc.</span>
              </div>
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="pt-4 border-t mt-4">
        <Button type="submit" disabled={isLoading || !isWeightValid} className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 rounded-xl">
          {isLoading ? (
            <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> Finalizing Template...</>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              {exam ? "Update Examination Template" : "Standardize Examination Template"}
            </div>
          )}
        </Button>
        {!isWeightValid && (
          <p className="text-center text-xs text-red-500 font-medium mt-3 flex items-center justify-center gap-1.5">
            <AlertCircle className="h-3 w-3" />
            Structure weighting must sum exactly to 100% before saving.
          </p>
        )}
      </div>
    </form>
  );
}
