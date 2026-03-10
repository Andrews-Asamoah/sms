"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createAssessmentTemplate,
  updateAssessmentTemplate,
} from "@/app/(school)/[schoolSlug]/admin/academics/grading/assessment-templates/actions";

// Enum should match Prisma
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
  displayOrder: z.coerce.number().optional(),
  isRequired: z.boolean().optional(),
  isRepeatable: z.boolean().default(false),
  expectedCount: z.coerce.number().min(1).default(1),
});

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  gradingSystemId: z.string().min(1, "Grading system is required"),
  classLevel: z.string().nullable().optional(),
  subjectCode: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  deadline: z.string().nullable().optional(),
  isLocked: z.boolean().optional(),
  classIds: z.array(z.string()).default([]),
  components: z
    .array(componentSchema)
    .min(1, "At least one component is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface AssessmentTemplateDialogProps {
  children?: React.ReactNode;
  schoolSlug: string;
  gradingSystems: { id: string; name: string }[];
  classes: { id: string; name: string }[];
  template?: any; // Replace with proper type
  mode?: "create" | "edit";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AssessmentTemplateDialog({
  children,
  schoolSlug,
  gradingSystems,
  classes = [],
  template,
  mode = "create",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: AssessmentTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const isControlled = controlledOpen !== undefined;
  const showDialog = isControlled ? controlledOpen : open;
  const setShowDialog =
    isControlled && setControlledOpen ? setControlledOpen : setOpen;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      gradingSystemId: "",
      classLevel: null,
      subjectCode: null,
      isActive: true,
      components: [
        {
          name: "Class Test",
          componentType: AssessmentType.CLASS_TEST,
          maxMarks: 100,
          weight: 30,
          isRequired: true,
          isRepeatable: true,
          expectedCount: 4,
        },
        {
          name: "Final Exam",
          componentType: AssessmentType.FINAL_EXAM,
          maxMarks: 100,
          weight: 70,
          isRequired: true,
          isRepeatable: false,
          expectedCount: 1,
        },
      ],
      deadline: null,
      isLocked: false,
      classIds: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "components",
  });

  useEffect(() => {
    if (template && mode === "edit") {
      form.reset({
        name: template.name,
        description: template.description || "",
        gradingSystemId: template.gradingSystemId,
        classLevel: template.classLevel,
        subjectCode: template.subjectCode,
        isActive: template.isActive,
        deadline: template.deadline ? new Date(template.deadline).toISOString() : null,
        isLocked: template.isLocked,
        classIds: template.classes?.map((c: any) => c.classId) || [],
        components: template.components.map((c: any) => ({
          id: c.id,
          name: c.name,
          componentType: c.componentType,
          maxMarks: Number(c.maxMarks),
          weight: Number(c.weight), // Ensure number
          isRequired: c.isRequired,
          isRepeatable: c.isRepeatable ?? false,
          expectedCount: c.expectedCount ?? 1,
        })),
      });
    } else if (mode === "create") {
      // Reset to defaults
      form.reset({
        name: "",
        description: "",
        gradingSystemId: "",
        components: [
          {
            name: "Class Test",
            componentType: AssessmentType.CLASS_TEST,
            maxMarks: 100,
            weight: 30,
            isRequired: true,
            isRepeatable: true,
            expectedCount: 4,
          },
          {
            name: "Final Exam",
            componentType: AssessmentType.FINAL_EXAM,
            maxMarks: 100,
            weight: 70,
            isRequired: true,
            isRepeatable: false,
            expectedCount: 1,
          },
        ],
      });
    }
  }, [template, mode, form, showDialog]);

  // Calculate total weight to display validation message
  const components = form.watch("components");
  const totalWeight =
    components?.reduce((sum, c) => sum + (Number(c.weight) || 0), 0) || 0;
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  async function onSubmit(data: FormValues) {
    if (!isWeightValid) {
      toast.error(`Total weight must be 100%. Current: ${totalWeight}%`);
      return;
    }

    setIsPending(true);
    try {
      let result;
      if (mode === "edit" && template) {
        result = await updateAssessmentTemplate(
          schoolSlug,
          template.id,
          data as any,
        );
      } else {
        result = await createAssessmentTemplate(schoolSlug, data as any);
      }

      if (result.success) {
        toast.success(result.message);
        setShowDialog(false);
        if (mode === "create") form.reset();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Create Assessment Template"
              : "Edit Assessment Template"}
          </DialogTitle>
          <DialogDescription>
            Define how students will be assessed. The total weight of all
            components must equal 100%.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Template Name</FieldLabel>
                  <FieldGroup>
                    <Input
                      placeholder="e.g. Standard Term Assessment"
                      {...field}
                    />
                  </FieldGroup>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="gradingSystemId"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Grading System</FieldLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FieldGroup>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grading system" />
                      </SelectTrigger>
                    </FieldGroup>
                    <SelectContent>
                      {gradingSystems.map((gs) => (
                        <SelectItem key={gs.id} value={gs.id}>
                          {gs.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="deadline"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Deadline for Marks Entry</FieldLabel>
                  <FieldGroup>
                    <DatePicker
                      date={field.value ? new Date(field.value) : undefined}
                      setDate={(date) => field.onChange(date?.toISOString() || null)}
                      placeholder="Select Deadline"
                    />
                  </FieldGroup>
                  <FieldDescription>
                    Teachers won't be able to edit marks after this date.
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Description (Optional)</FieldLabel>
                <FieldGroup>
                  <Textarea
                    placeholder="Describe this assessment template..."
                    {...field}
                  />
                </FieldGroup>
                {fieldState.error && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          <div className="space-y-4">
            <FieldLabel>Assigned Classes</FieldLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-muted/20 p-4 rounded-lg border">
              {classes.map((cls) => (
                <Controller
                  key={cls.id}
                  control={form.control}
                  name="classIds"
                  render={({ field }) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`class-${cls.id}`}
                        checked={field.value?.includes(cls.id)}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          if (checked) {
                            field.onChange([...current, cls.id]);
                          } else {
                            field.onChange(current.filter((id) => id !== cls.id));
                          }
                        }}
                      />
                      <label 
                        htmlFor={`class-${cls.id}`}
                        className="text-sm font-medium leading-none cursor-pointer select-none"
                      >
                        {cls.name}
                      </label>
                    </div>
                  )}
                />
              ))}
              {classes.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full italic">
                  No active classes found for the current academic year.
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Select one or more classes that will use this assessment template.
            </p>
          </div>

          <div className="border rounded-md p-4 bg-muted/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Assessment Components</h3>
              <div
                className={`text-sm font-medium ${isWeightValid ? "text-green-600" : "text-red-500"}`}
              >
                Total Weight: {totalWeight}%
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[180px]">Type</TableHead>
                  <TableHead className="w-[80px]">Max Marks</TableHead>
                  <TableHead className="w-[80px]">Weight (%)</TableHead>
                  <TableHead className="w-[120px]">Repeatable?</TableHead>
                  <TableHead className="w-[90px]">Occurrences</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Controller
                        control={form.control}
                        name={`components.${index}.name`}
                        render={({ field, fieldState }) => (
                          <Field>
                            <FieldGroup>
                              <Input {...field} />
                            </FieldGroup>
                            {fieldState.error && (
                              <FieldError>
                                {fieldState.error.message}
                              </FieldError>
                            )}
                          </Field>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={form.control}
                        name={`components.${index}.componentType`}
                        render={({ field, fieldState }) => (
                          <Field>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FieldGroup>
                                <SelectTrigger>
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                              </FieldGroup>
                              <SelectContent>
                                {Object.entries(AssessmentType).map(
                                  ([key, type]) => (
                                    <SelectItem key={key} value={type}>
                                      {type.replace(/_/g, " ")}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                            {fieldState.error && (
                              <FieldError>
                                {fieldState.error.message}
                              </FieldError>
                            )}
                          </Field>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={form.control}
                        name={`components.${index}.maxMarks`}
                        render={({ field, fieldState }) => (
                          <Field>
                            <FieldGroup>
                              <Input type="number" {...field} />
                            </FieldGroup>
                            {fieldState.error && (
                              <FieldError>
                                {fieldState.error.message}
                              </FieldError>
                            )}
                          </Field>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={form.control}
                        name={`components.${index}.weight`}
                        render={({ field, fieldState }) => (
                          <Field>
                            <FieldGroup>
                              <Input type="number" {...field} />
                            </FieldGroup>
                            {fieldState.error && (
                              <FieldError>
                                {fieldState.error.message}
                              </FieldError>
                            )}
                          </Field>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={form.control}
                        name={`components.${index}.isRepeatable`}
                        render={({ field }) => (
                          <div className="flex items-center justify-center h-10 w-full">
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </div>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={form.control}
                        name={`components.${index}.expectedCount`}
                        render={({ field, fieldState }) => (
                          <Field>
                            <FieldGroup>
                              <Input 
                                type="number" 
                                {...field} 
                                disabled={!form.watch(`components.${index}.isRepeatable`)}
                                className="bg-muted/50 w-full"
                              />
                            </FieldGroup>
                            {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                          </Field>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() =>
                append({
                  name: "New Component",
                  componentType: AssessmentType.CLASS_TEST,
                  maxMarks: 100,
                  weight: 0,
                  isRequired: true,
                  isRepeatable: false,
                  expectedCount: 1,
                })
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="isActive"
              render={({ field, fieldState }) => (
                <Field className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <div className="space-y-1 leading-none">
                    <FieldLabel>Active Status</FieldLabel>
                    <FieldDescription>
                      Inactive templates cannot be selected.
                    </FieldDescription>
                  </div>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="isLocked"
              render={({ field, fieldState }) => (
                <Field className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <div className="space-y-1 leading-none">
                    <FieldLabel>Lock Automatically</FieldLabel>
                    <FieldDescription>
                      Lock all marks for this template immediately.
                    </FieldDescription>
                  </div>
                </Field>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !isWeightValid}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Template" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
