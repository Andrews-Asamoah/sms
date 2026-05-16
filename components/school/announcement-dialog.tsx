"use client";

import { useEffect, useState, useCallback } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useSchoolData } from "@/lib/school-data-context";

// ─── Tiptap toolbar ───────────────────────────────────────────────────────────
function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;
  const btn = (action: () => void, label: string, isActive?: boolean) => (
    <button
      type="button"
      onClick={action}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/40 rounded-t-md">
      {btn(() => editor.chain().focus().toggleBold().run(), "B", editor.isActive("bold"))}
      {btn(() => editor.chain().focus().toggleItalic().run(), "I", editor.isActive("italic"))}
      {btn(() => editor.chain().focus().toggleStrike().run(), "S̶", editor.isActive("strike"))}
      <div className="w-px bg-border mx-1" />
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", editor.isActive("heading", { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3", editor.isActive("heading", { level: 3 }))}
      <div className="w-px bg-border mx-1" />
      {btn(() => editor.chain().focus().toggleBulletList().run(), "• List", editor.isActive("bulletList"))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), "1. List", editor.isActive("orderedList"))}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), "❝", editor.isActive("blockquote"))}
      <div className="w-px bg-border mx-1" />
      {btn(() => editor.chain().focus().undo().run(), "↩")}
      {btn(() => editor.chain().focus().redo().run(), "↪")}
    </div>
  );
}

// ─── Form schema ─────────────────────────────────────────────────────────────
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  target: z.enum(["ALL", "TEACHER", "STUDENT", "STAFF", "GUARDIAN", "CLASS", "CLUB"]),
  targetId: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  messageType: z.enum(["ANNOUNCEMENT", "FINANCIAL"]),
  sendSms: z.boolean(),
  sendEmail: z.boolean(),
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
    contentHtml?: string;
    target: string;
    messageType?: string;
    expiresAt?: string | null;
  } | null;
  onSuccess: () => void;
  canSendExternal?: boolean;
}

export function AnnouncementDialog({
  open,
  onOpenChange,
  schoolSlug,
  announcementToEdit,
  onSuccess,
  canSendExternal = false,
}: AnnouncementDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { classes, fetchClasses } = useSchoolData();
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        class: "min-h-[160px] p-3 outline-none prose prose-sm dark:prose-invert max-w-none text-sm",
      },
    },
  });

  const {
    register, handleSubmit, setValue, watch, reset, control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", target: "ALL", targetId: "", expiresAt: "", messageType: "ANNOUNCEMENT", sendSms: false, sendEmail: false },
  });

  const target = watch("target");
  const targetId = watch("targetId");
  const expiresAt = watch("expiresAt");
  const messageType = watch("messageType");
  const sendSms = watch("sendSms");
  const sendEmail = watch("sendEmail");

  useEffect(() => {
    if (!open) return;

    fetchClasses();
    fetch(`/api/schools/${schoolSlug}/teacher/clubs`)
      .then((r) => r.json()).then((d) => setClubs(Array.isArray(d) ? d : [])).catch(() => setClubs([]));

    if (announcementToEdit) {
      let initTarget = announcementToEdit.target;
      let initTargetId = "";
      if (initTarget.startsWith("CLASS:")) { initTargetId = initTarget.split(":")[1]; initTarget = "CLASS"; }
      else if (initTarget.startsWith("CLUB:")) { initTargetId = initTarget.split(":")[1]; initTarget = "CLUB"; }

      reset({
        title: announcementToEdit.title,
        target: initTarget as any,
        targetId: initTargetId,
        expiresAt: announcementToEdit.expiresAt ? format(new Date(announcementToEdit.expiresAt), "yyyy-MM-dd'T'HH:mm") : "",
        messageType: (announcementToEdit.messageType as any) || "ANNOUNCEMENT",
        sendSms: false,
        sendEmail: false,
      });
      editor?.commands.setContent(announcementToEdit.contentHtml || announcementToEdit.content || "");
    } else {
      reset({ title: "", target: "ALL", targetId: "", expiresAt: "", messageType: "ANNOUNCEMENT", sendSms: false, sendEmail: false });
      editor?.commands.setContent("");
    }
  }, [open, announcementToEdit, reset, schoolSlug, editor, fetchClasses]);

  const onSubmit = async (data: FormValues) => {
    const contentHtml = editor?.getHTML() || "";
    const content = editor?.getText() || "";

    if (!content.trim()) {
      toast.error("Message content cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalTarget = data.target as string;
      if (data.target === "CLASS" && data.targetId) finalTarget = `CLASS:${data.targetId}`;
      else if (data.target === "CLUB" && data.targetId) finalTarget = `CLUB:${data.targetId}`;

      const url = announcementToEdit
        ? `/api/schools/${schoolSlug}/announcements/${announcementToEdit.id}`
        : `/api/schools/${schoolSlug}/announcements`;

      const res = await fetch(url, {
        method: announcementToEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          target: finalTarget,
          content,
          contentHtml,
          expiresAt: data.expiresAt || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save announcement");
      }

      toast.success(announcementToEdit ? "Announcement updated" : "Announcement published");
      if (data.sendSms || data.sendEmail) {
        toast.info("External delivery is processing in the background...");
      }
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{announcementToEdit ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
          <DialogDescription>
            {announcementToEdit ? "Update this announcement." : "Compose and publish a new announcement."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <FieldGroup>
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="ann-title">Title</FieldLabel>
              <Input id="ann-title" placeholder="Announcement title" {...register("title")} />
              <FieldError errors={[errors.title]} />
            </Field>

            {/* Rich text editor */}
            <Field>
              <FieldLabel>Content</FieldLabel>
              <div className="border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                <EditorToolbar editor={editor} />
                <EditorContent editor={editor} />
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.target}>
                <FieldLabel htmlFor="ann-target">Target Audience</FieldLabel>
                <Controller
                  name="target"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(val) => { field.onChange(val); setValue("targetId", ""); }} value={field.value}>
                      <SelectTrigger id="ann-target"><SelectValue placeholder="Select target" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Everyone</SelectItem>
                        <SelectItem value="TEACHER">Teachers Only</SelectItem>
                        <SelectItem value="STUDENT">Students & Parents</SelectItem>
                        <SelectItem value="STAFF">Staff Only</SelectItem>
                        <SelectItem value="GUARDIAN">Guardians Only</SelectItem>
                        <SelectItem value="CLASS">Specific Class</SelectItem>
                        <SelectItem value="CLUB">Specific Club</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.target]} />
              </Field>

              <Field data-invalid={!!errors.expiresAt}>
                <FieldLabel htmlFor="ann-expires">Expires At (Optional)</FieldLabel>
                <Input id="ann-expires" type="datetime-local" {...register("expiresAt")} value={expiresAt || ""} />
                <FieldError errors={[errors.expiresAt]} />
              </Field>
            </div>

            {target === "CLASS" && (
              <Field>
                <FieldLabel>Select Class</FieldLabel>
                <Controller name="targetId" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
                    <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </Field>
            )}

            {target === "CLUB" && (
              <Field>
                <FieldLabel>Select Club</FieldLabel>
                <Controller name="targetId" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger><SelectValue placeholder="Choose a club" /></SelectTrigger>
                    <SelectContent>{clubs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </Field>
            )}

            {/* Message type */}
            <Field>
              <FieldLabel>Message Type</FieldLabel>
              <Controller name="messageType" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANNOUNCEMENT">📢 General Announcement</SelectItem>
                    <SelectItem value="FINANCIAL">💰 Financial Notice</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </Field>

            {/* External delivery toggles */}
            {canSendExternal && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-medium">External Delivery Channels</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <Label htmlFor="send-sms" className="text-sm">Send via SMS (Hubtel)</Label>
                  </div>
                  <Controller name="sendSms" control={control} render={({ field }) => (
                    <Switch id="send-sms" checked={field.value} onCheckedChange={field.onChange} />
                  )} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-indigo-500" />
                    <Label htmlFor="send-email" className="text-sm">Send via Email (Resend)</Label>
                  </div>
                  <Controller name="sendEmail" control={control} render={({ field }) => (
                    <Switch id="send-email" checked={field.value} onCheckedChange={field.onChange} />
                  )} />
                </div>
                {(sendSms || sendEmail) && (
                  <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded p-2">
                    ⚡ External messages are delivered in the background. You&apos;ll see delivery counts on the announcement card after sending.
                  </p>
                )}
              </div>
            )}
          </FieldGroup>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {announcementToEdit ? "Update" : "Publish"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
