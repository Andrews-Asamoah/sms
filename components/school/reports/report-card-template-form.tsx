"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
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

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(termSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  async function onSubmit(values: TemplateFormValues) {
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Standard Terminal Report"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional description of this template..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <FormDescription>
                  Determine if this template can be used for new report sets.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
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
    </Form>
  );
}
