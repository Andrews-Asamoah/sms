"use client";

import { useState, useTransition } from "react";
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
import { Loader2, Send } from "lucide-react";

interface SupportTicketFormProps {
  schoolId: string;
  schoolSlug: string;
}

export function SupportTicketForm({ schoolId, schoolSlug }: SupportTicketFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      const result = await createSupportTicket({
        subject: subject.trim(),
        description: description.trim(),
        priority,
        schoolId,
        schoolSlug,
      });

      if (result.success) {
        toast.success("Ticket submitted! Our team will get back to you soon.");
        router.push(`/${schoolSlug}/admin/support/${result.ticketId}`);
      } else {
        toast.error(result.error || "Failed to submit ticket. Please try again.");
      }
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="subject">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              placeholder="e.g. Unable to generate report cards for Term 2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Please describe the issue in as much detail as possible, including any steps to reproduce it..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none"
              required
            />
            <p className="text-xs text-muted-foreground">
              Include specific steps, error messages, or screenshots if applicable.
            </p>
          </div>

          {/* Priority */}
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

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending || !subject.trim() || !description.trim()}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Ticket
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/${schoolSlug}/admin/support`)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
