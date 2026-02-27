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

export default function NewReportCardSetPage() {
  const { schoolSlug } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    templates: [],
    years: [],
    terms: [],
    classes: [],
  });

  const [formData, setFormData] = useState({
    name: "",
    templateId: "",
    academicYearId: "",
    termId: "",
    classId: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, yearsRes, classesRes] = await Promise.all([
          fetch(`/api/schools/${schoolSlug}/report-cards/templates`),
          fetch(`/api/schools/${schoolSlug}/academic-years`),
          fetch(`/api/schools/${schoolSlug}/classes`),
        ]);

        const [templates, years, classes] = await Promise.all([
          templatesRes.json(),
          yearsRes.json(),
          classesRes.json(),
        ]);

        setData({
          templates,
          years,
          terms: [],
          classes: classes.classes || classes,
        });
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

      const newSet = await response.json();
      toast.success("Report card set created");
      router.push(
        `/${schoolSlug}/admin/reports/report-cards/sets/${newSet.id}`,
      );
    } catch (error) {
      toast.error("Failed to create report card set");
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
            Configure the academic term and class for this report card batch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Set Name (e.g. Primary 1 - Term 1 - 2024/25)
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter a descriptive name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select
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
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Class</Label>
                <Select
                  onValueChange={(v) =>
                    setFormData({ ...formData, classId: v })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                {loading ? "Creating..." : "Create Report Set"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
