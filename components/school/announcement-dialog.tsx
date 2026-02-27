"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  target: z.enum(["ALL", "TEACHER", "STUDENT", "STAFF"]),
  expiresAt: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface AnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolSlug: string;
  announcementToEdit?: {
    id: string;
    title: string;
    content: string;
    target: "ALL" | "TEACHER" | "STUDENT" | "STAFF";
    expiresAt?: string | null;
  } | null;
  onSuccess: () => void;
}

export function AnnouncementDialog({
  open,
  onOpenChange,
  schoolSlug,
  announcementToEdit,
  onSuccess,
}: AnnouncementDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      target: "ALL",
      expiresAt: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (announcementToEdit) {
        form.reset({
          title: announcementToEdit.title,
          content: announcementToEdit.content,
          target: announcementToEdit.target as
            | "ALL"
            | "TEACHER"
            | "STUDENT"
            | "STAFF",
          expiresAt: announcementToEdit.expiresAt
            ? format(
                new Date(announcementToEdit.expiresAt),
                "yyyy-MM-dd'T'HH:mm",
              )
            : "",
        });
      } else {
        form.reset({
          title: "",
          content: "",
          target: "ALL",
          expiresAt: "",
        });
      }
    }
  }, [open, announcementToEdit, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const url = announcementToEdit
        ? `/api/schools/${schoolSlug}/announcements/${announcementToEdit.id}`
        : `/api/schools/${schoolSlug}/announcements`;
      const method = announcementToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          expiresAt: data.expiresAt || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save announcement");
      }

      toast.success(
        announcementToEdit
          ? "Announcement updated successfully"
          : "Announcement created successfully",
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {announcementToEdit ? "Edit Announcement" : "Create Announcement"}
          </DialogTitle>
          <DialogDescription>
            {announcementToEdit
              ? "Update the details of this announcement."
              : "Create a new announcement to notify users."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter announcement title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter announcement details..."
                      rows={4}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL">Everyone</SelectItem>
                        <SelectItem value="TEACHER">Teachers Only</SelectItem>
                        <SelectItem value="STUDENT">
                          Students & Parents
                        </SelectItem>
                        <SelectItem value="STAFF">Staff Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires At (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {announcementToEdit ? "Update" : "Publish"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
