"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  target: z.enum(["ALL", "TEACHER", "STUDENT", "STAFF", "GUARDIAN", "CLASS", "CLUB"]),
  targetId: z.string().optional().nullable(),
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
    target: string;
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
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      target: "ALL",
      targetId: "",
      expiresAt: "",
    },
  });

  const target = watch("target");
  const targetId = watch("targetId");
  const expiresAt = watch("expiresAt");

  useEffect(() => {
    if (open) {
      const classEndpoint = `/api/schools/${schoolSlug}/classes`;
      const clubEndpoint = `/api/schools/${schoolSlug}/teacher/clubs`; // Clubs are currently teacher-centric or need a common endpoint

      fetch(classEndpoint)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setClasses(data);
          } else {
            console.error("Classes data is not an array:", data);
            setClasses([]);
          }
        })
        .catch(() => setClasses([]));
        
      fetch(clubEndpoint)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setClubs(data);
          } else {
            console.error("Clubs data is not an array:", data);
            setClubs([]);
          }
        })
        .catch(() => setClubs([]));

      if (announcementToEdit) {
        let initialTarget = "ALL";
        let initialTargetId = "";

        if (announcementToEdit.target.startsWith("CLASS:")) {
          initialTarget = "CLASS";
          initialTargetId = announcementToEdit.target.split(":")[1];
        } else if (announcementToEdit.target.startsWith("CLUB:")) {
          initialTarget = "CLUB";
          initialTargetId = announcementToEdit.target.split(":")[1];
        } else {
          initialTarget = announcementToEdit.target;
        }

        reset({
          title: announcementToEdit.title,
          content: announcementToEdit.content,
          target: initialTarget as any,
          targetId: initialTargetId,
          expiresAt: announcementToEdit.expiresAt
            ? format(
                new Date(announcementToEdit.expiresAt),
                "yyyy-MM-dd'T'HH:mm",
              )
            : "",
        });
      } else {
        reset({
          title: "",
          content: "",
          target: "ALL",
          targetId: "",
          expiresAt: "",
        });
      }
    }
  }, [open, announcementToEdit, reset, schoolSlug]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const url = announcementToEdit
        ? `/api/schools/${schoolSlug}/announcements/${announcementToEdit.id}`
        : `/api/schools/${schoolSlug}/announcements`;
      const method = announcementToEdit ? "PUT" : "POST";

      let finalTarget = data.target as string;
      if (data.target === "CLASS" && data.targetId) {
        finalTarget = `CLASS:${data.targetId}`;
      } else if (data.target === "CLUB" && data.targetId) {
        finalTarget = `CLUB:${data.targetId}`;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          target: finalTarget,
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="ann-title">Title</FieldLabel>
              <Input id="ann-title" placeholder="Enter announcement title" {...register("title")} />
              <FieldError errors={[errors.title]} />
            </Field>

            <Field data-invalid={!!errors.content}>
              <FieldLabel htmlFor="ann-content">Content</FieldLabel>
              <Textarea
                id="ann-content"
                placeholder="Enter announcement details..."
                rows={4}
                className="resize-none"
                {...register("content")}
              />
              <FieldError errors={[errors.content]} />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={!!errors.target}>
                <FieldLabel htmlFor="ann-target">Target Audience</FieldLabel>
                <Select
                  onValueChange={(val) => {
                    setValue("target", val as any);
                    setValue("targetId", ""); // Reset targetId when target changes
                  }}
                  value={target}
                >
                  <SelectTrigger id="ann-target">
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Everyone</SelectItem>
                    <SelectItem value="TEACHER">Teachers Only</SelectItem>
                    <SelectItem value="STUDENT">
                      Students & Parents
                    </SelectItem>
                    <SelectItem value="STAFF">Staff Only</SelectItem>
                    <SelectItem value="GUARDIAN">Guardians Only</SelectItem>
                    <SelectItem value="CLASS">Specific Class</SelectItem>
                    <SelectItem value="CLUB">Specific Club</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.target]} />
              </Field>

              <Field data-invalid={!!errors.expiresAt}>
                <FieldLabel htmlFor="ann-expires">Expires At (Optional)</FieldLabel>
                <Input
                  id="ann-expires"
                  type="datetime-local"
                  {...register("expiresAt")}
                  value={expiresAt || ""}
                />
                <FieldError errors={[errors.expiresAt]} />
              </Field>
            </div>

            {target === "CLASS" && (
              <Field data-invalid={!!errors.targetId}>
                <FieldLabel htmlFor="ann-class">Select Class</FieldLabel>
                <Select
                  onValueChange={(val) => setValue("targetId", val)}
                  value={targetId || ""}
                >
                  <SelectTrigger id="ann-class">
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.targetId]} />
              </Field>
            )}

            {target === "CLUB" && (
              <Field data-invalid={!!errors.targetId}>
                <FieldLabel htmlFor="ann-club">Select Club</FieldLabel>
                <Select
                  onValueChange={(val) => setValue("targetId", val)}
                  value={targetId || ""}
                >
                  <SelectTrigger id="ann-club">
                    <SelectValue placeholder="Choose a club" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.targetId]} />
              </Field>
            )}
          </FieldGroup>

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
      </DialogContent>
    </Dialog>
  );
}
