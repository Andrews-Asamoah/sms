"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { createSupportTicket } from "@/app/(system)/support/actions";
import { Loader2, Send, Paperclip, X } from "lucide-react";

interface SupportTicketFormProps {
  schoolId: string;
  schoolSlug: string;
  isInternal?: boolean; // Used by students, teachers, guardians to send to school admin
  portalType?: "teacher" | "student" | "guardian";
}

const CATEGORIES = [
  "General Inquiry",
  "Bug / Technical Issue",
  "Feature Request",
  "Billing / Subscription",
  "Account Access",
  "Other",
];

export function SupportTicketForm({ schoolId, schoolSlug, isInternal = false, portalType }: SupportTicketFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General Inquiry");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    let attachmentUrl: string | undefined = undefined;

    if (file) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "support");

        const res = await fetch(`/api/schools/${schoolSlug}/upload`, {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to upload file");
        }
        
        const data = await res.json();
        attachmentUrl = data.url;
      } catch (error: any) {
        setIsUploading(false);
        toast.error(`Upload failed: ${error.message}`);
        return;
      }
    }

    startTransition(async () => {
      const result = await createSupportTicket({
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category,
        attachmentUrl,
        isInternal,
        schoolId,
        schoolSlug,
      });

      if (result.success) {
        toast.success("Ticket submitted! Our team will get back to you soon.");
        let redirectPath = `admin/support/${result.ticketId}`;
        if (portalType === "teacher") {
          redirectPath = `teacher/reports/${result.ticketId}`;
        } else if (portalType === "student") {
          redirectPath = `student/support/${result.ticketId}`;
        } else if (portalType === "guardian") {
          redirectPath = `guardian/support/${result.ticketId}`;
        } else if (isInternal) {
          redirectPath = `teacher/reports/${result.ticketId}`;
        }
        router.push(`/${schoolSlug}/${redirectPath}`);
      } else {
        setIsUploading(false);
        toast.error(result.error || "Failed to submit ticket. Please try again.");
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // Limit to 5MB
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File size should not exceed 5MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFile(selectedFile);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority Level</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as typeof priority)}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low — General question or minor inconvenience</SelectItem>
                  <SelectItem value="MEDIUM">Medium — Feature not working as expected</SelectItem>
                  <SelectItem value="HIGH">High — Important functionality broken</SelectItem>
                  <SelectItem value="URGENT">Urgent — Critical issue affecting all users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="subject">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              placeholder="e.g. Unable to access my reports"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">{description.length}/2000</span>
            </div>
            <Textarea
              id="description"
              placeholder="Please describe the issue in as much detail as possible, including any steps to reproduce it..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={6}
              className="resize-none"
              required
            />
          </div>

          {/* Attachment */}
          <div className="space-y-1.5">
            <Label>Attachment (Optional)</Label>
            <div className="flex items-center gap-4">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm bg-muted px-3 py-1.5 rounded-full border max-w-[200px] sm:max-w-md">
                  <span className="truncate flex-1 font-medium">{file.name}</span>
                  <button 
                    type="button" 
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Images or documents (Max 5MB).
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending || isUploading || !subject.trim() || !description.trim()}>
              {(isPending || isUploading) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isUploading ? "Uploading..." : "Submit Ticket"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isPending || isUploading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
