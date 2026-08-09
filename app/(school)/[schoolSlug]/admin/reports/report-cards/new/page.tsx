"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { Checkbox } from "@/components/ui/checkbox";

import { TemplatePreviewDialog } from "../templates/template-preview-dialog";

export default function NewReportCardSetPage() {
  const { schoolSlug } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    templates: [] as any[],
    years: [] as any[],
    terms: [] as any[],
    classes: [] as any[],
    departments: [] as any[],
  });

  const [formData, setFormData] = useState({
    name: "",
    templateId: "",
    academicYearId: "",
    termId: "",
    classIds: [] as string[],
  });

  const selectedTemplate = data.templates.find((t: any) => t.id === formData.templateId);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, yearsRes, classesRes, departmentsRes] = await Promise.all([
          fetch(`/api/schools/${schoolSlug}/report-cards/templates`),
          fetch(`/api/schools/${schoolSlug}/academic-years`),
          fetch(`/api/schools/${schoolSlug}/classes`),
          fetch(`/api/schools/${schoolSlug}/departments`),
        ]);

        const [templates, years, classes, departments] = await Promise.all([
          templatesRes.json(),
          yearsRes.json(),
          classesRes.json(),
          departmentsRes.json(),
        ]);

        setData({
          templates,
          years,
          terms: [],
          classes: classes.classes || classes,
          departments,
        });

        // Pre-select first template if available
        if (templates.length > 0) {
          setFormData((prev) => ({ ...prev, templateId: prev.templateId || templates[0].id }));
        }
      } catch (error) {
        toast.error("Error loading form data");
      }
    };
    fetchData();
  }, [schoolSlug]);

  const handleYearChange = async (yearId: string) => {
    setFormData({ ...formData, academicYearId: yearId, termId: "" });
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/terms?academicYearId=${yearId}`,
      );
      const terms = await response.json();
      setData({ ...data, terms });
    } catch (error) {
      toast.error("Error loading terms");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.classIds.length === 0) {
      toast.error("Please select at least one class");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/report-cards/sets`,
        {
          method: "POST",
          body: JSON.stringify(formData),
        },
      );

      if (!response.ok) throw new Error("Failed to create");

      toast.success("Report card sets created");
      router.push(
        `/${schoolSlug}/admin/reports/report-cards`,
      );
    } catch (error) {
      toast.error("Failed to create report card sets");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">
          New Report Card Set
        </h2>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Set Configuration</CardTitle>
          <CardDescription>
            Configure the academic term and classes for this report card batch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Set Name Prefix (e.g. "Terminal Report - ")
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter a descriptive prefix"
                required
              />
              <p className="text-xs text-muted-foreground">
                The class name will be appended to this prefix for each set.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Template Design</Label>
                  {selectedTemplate && (
                    <TemplatePreviewDialog template={selectedTemplate} />
                  )}
                </div>
                <Select
                  value={formData.templateId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, templateId: v })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Template" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.templates.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.department ? `(${t.department.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate?.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedTemplate.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select onValueChange={handleYearChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.years.map((y: any) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label>Term</Label>
                <Select
                  onValueChange={(v) => setFormData({ ...formData, termId: v })}
                  disabled={!formData.academicYearId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Term" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.terms.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Classes</Label>
                <MultiSelect
                  options={data.classes.map((c: any) => ({
                    label: c.name,
                    value: c.id,
                  }))}
                  selected={formData.classIds}
                  onChange={(values) =>
                    setFormData({ ...formData, classIds: values })
                  }
                  placeholder="Select Classes"
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label className="text-sm font-medium">Quick Select by Department</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {data.departments.map((dept: any) => (
                    <div key={dept.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={dept.id}
                        onCheckedChange={(checked) => {
                          const deptClasses = data.classes
                            .filter((c: any) => c.departmentId === dept.id)
                            .map((c: any) => c.id);
                          
                          if (checked) {
                            const newClassIds = Array.from(new Set([...formData.classIds, ...deptClasses]));
                            setFormData({ ...formData, classIds: newClassIds });
                          } else {
                            const newClassIds = formData.classIds.filter(id => !deptClasses.includes(id));
                            setFormData({ ...formData, classIds: newClassIds });
                          }
                        }}
                      />
                      <label
                        htmlFor={dept.id}
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-opacity-70"
                      >
                        {dept.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Creating..." : "Create Report Sets"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
