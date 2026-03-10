"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import {
  Loader2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Building2,
  GraduationCap,
  School,
  X,
} from "lucide-react";

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  templateId: z.string().min(1, "Template is required"),
  academicYearId: z.string().min(1, "Academic year is required"),
  termId: z.string().min(1, "Term is required"),
  classIds: z.array(z.string()).min(1, "At least one class is required"),
});

type FormValues = z.infer<typeof formSchema>;

export interface ClassWithDept {
  id: string;
  name: string;
  department?: { id: string; name: string } | null;
}

interface ReportCardSetFormProps {
  schoolSlug: string;
  academicYears: Array<{ id: string; name: string }>;
  terms: Array<{ id: string; name: string; academicYearId: string }>;
  classes: ClassWithDept[];
  templates: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export function ReportCardSetForm({
  schoolSlug,
  academicYears,
  terms,
  classes,
  templates,
  onSuccess,
}: ReportCardSetFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      templateId: "",
      academicYearId: "",
      termId: "",
      classIds: [],
    },
  });

  const selectedYearId = watch("academicYearId");
  const selectedTermId = watch("termId");
  const selectedTemplateId = watch("templateId");
  const selectedClassIds = watch("classIds");

  const filteredTerms = terms.filter(
    (term) => term.academicYearId === selectedYearId,
  );

  // Group classes by department
  const classesByDept = useMemo(() => {
    const grouped = new Map<string, { deptName: string; classes: ClassWithDept[] }>();

    // "No Department" bucket
    grouped.set("__none__", { deptName: "No Department", classes: [] });

    for (const cls of classes) {
      const deptId = cls.department?.id ?? "__none__";
      const deptName = cls.department?.name ?? "No Department";
      if (!grouped.has(deptId)) {
        grouped.set(deptId, { deptName, classes: [] });
      }
      grouped.get(deptId)!.classes.push(cls);
    }

    // Remove the "No Department" bucket if empty
    if (grouped.get("__none__")!.classes.length === 0) {
      grouped.delete("__none__");
    }

    return grouped;
  }, [classes]);

  const toggleClass = (classId: string) => {
    const current = selectedClassIds ?? [];
    if (current.includes(classId)) {
      setValue("classIds", current.filter((id) => id !== classId), { shouldValidate: true });
    } else {
      setValue("classIds", [...current, classId], { shouldValidate: true });
    }
  };

  const toggleDept = (deptId: string) => {
    const deptClasses = classesByDept.get(deptId)?.classes ?? [];
    const deptClassIds = deptClasses.map((c) => c.id);
    const current = selectedClassIds ?? [];
    const allSelected = deptClassIds.every((id) => current.includes(id));

    if (allSelected) {
      // Deselect all in this dept
      setValue("classIds", current.filter((id) => !deptClassIds.includes(id)), { shouldValidate: true });
    } else {
      // Select all in this dept
      const newIds = Array.from(new Set([...current, ...deptClassIds]));
      setValue("classIds", newIds, { shouldValidate: true });
    }
  };

  const selectAll = () => {
    setValue("classIds", classes.map((c) => c.id), { shouldValidate: true });
  };

  const clearAll = () => {
    setValue("classIds", [], { shouldValidate: true });
  };

  const toggleDeptExpand = (deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/schools/${schoolSlug}/report-cards/sets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to create report set");
      }

      toast.success("Report card set created successfully");
      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      <FieldGroup>
        {/* Name */}
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="set-name">Name</FieldLabel>
          <Input id="set-name" placeholder="e.g., JHS 1 - Term 1 - 2025" {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>

        {/* Year + Term */}
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.academicYearId}>
            <FieldLabel htmlFor="year-select">Academic Year</FieldLabel>
            <Select
              onValueChange={(val) => {
                setValue("academicYearId", val);
                setValue("termId", ""); // reset term
              }}
              value={selectedYearId}
            >
              <SelectTrigger id="year-select">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.academicYearId]} />
          </Field>

          <Field data-invalid={!!errors.termId}>
            <FieldLabel htmlFor="term-select">Term</FieldLabel>
            <Select
              onValueChange={(val) => setValue("termId", val)}
              value={selectedTermId}
              disabled={!selectedYearId}
            >
              <SelectTrigger id="term-select">
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                {filteredTerms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.termId]} />
          </Field>
        </div>

        {/* Template */}
        <Field data-invalid={!!errors.templateId}>
          <FieldLabel htmlFor="template-select">Template</FieldLabel>
          <Select
            onValueChange={(val) => setValue("templateId", val)}
            value={selectedTemplateId}
          >
            <SelectTrigger id="template-select">
              <SelectValue placeholder="Select Template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={[errors.templateId]} />
        </Field>

        {/* Class Multi-Select */}
        <Field data-invalid={!!errors.classIds}>
          <div className="flex items-center justify-between">
            <FieldLabel>Classes</FieldLabel>
            <div className="flex items-center gap-2">
              {selectedClassIds?.length > 0 && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {selectedClassIds.length} selected
                </Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={selectAll}
              >
                <School className="h-3 w-3 mr-1" />
                All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 text-muted-foreground"
                onClick={clearAll}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          <ScrollArea className="h-60 border rounded-md bg-muted/10 p-2">
            <div className="space-y-1">
              {Array.from(classesByDept.entries()).map(([deptId, { deptName, classes: deptClasses }]) => {
                const deptClassIds = deptClasses.map((c) => c.id);
                const selectedInDept = deptClassIds.filter((id) => (selectedClassIds ?? []).includes(id));
                const allSelected = selectedInDept.length === deptClassIds.length;
                const someSelected = selectedInDept.length > 0 && !allSelected;
                const isExpanded = expandedDepts.has(deptId);

                return (
                  <Collapsible key={deptId} open={isExpanded}>
                    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/40 group">
                      {/* Dept checkbox */}
                      <div
                        role="checkbox"
                        aria-checked={allSelected ? true : someSelected ? "mixed" : false}
                        className="cursor-pointer flex-shrink-0"
                        onClick={() => toggleDept(deptId)}
                      >
                        {allSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : someSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary/50" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span
                        className="flex-1 text-sm font-medium cursor-pointer"
                        onClick={() => toggleDept(deptId)}
                      >
                        {deptName}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        {selectedInDept.length}/{deptClasses.length}
                      </Badge>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                          onClick={() => toggleDeptExpand(deptId)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                      <div className="ml-6 pl-3 border-l border-border/50 space-y-0.5 py-1">
                        {deptClasses.map((cls) => {
                          const isChecked = (selectedClassIds ?? []).includes(cls.id);
                          return (
                            <div
                              key={cls.id}
                              className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/40 cursor-pointer"
                              onClick={() => toggleClass(cls.id)}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleClass(cls.id)}
                                className="pointer-events-none"
                              />
                              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{cls.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
              {classes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active classes found.
                </p>
              )}
            </div>
          </ScrollArea>

          {(errors.classIds as any)?.message && (
            <p className="text-sm text-destructive mt-1">
              {(errors.classIds as any).message}
            </p>
          )}
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" type="button" onClick={() => onSuccess?.()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Set
        </Button>
      </div>
    </form>
  );
}
