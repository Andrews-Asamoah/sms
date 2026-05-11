"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, Search, MessageSquare, Mail, Bell, DollarSign, Users, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface Student {
  id: string;
  studentId: string;
  outstandingBalance: number;
  profile: { firstName: string; lastName: string } | null;
  class?: { name: string } | null;
}

function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;
  const btn = (action: () => void, label: string, active?: boolean) => (
    <button type="button" onClick={action}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/40 rounded-t-md">
      {btn(() => editor.chain().focus().toggleBold().run(), "B", editor.isActive("bold"))}
      {btn(() => editor.chain().focus().toggleItalic().run(), "I", editor.isActive("italic"))}
      <div className="w-px bg-border mx-1" />
      {btn(() => editor.chain().focus().toggleBulletList().run(), "• List", editor.isActive("bulletList"))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), "1. List", editor.isActive("orderedList"))}
      <div className="w-px bg-border mx-1" />
      {btn(() => editor.chain().focus().undo().run(), "↩")}
      {btn(() => editor.chain().focus().redo().run(), "↪")}
    </div>
  );
}

interface FinancialMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolSlug: string;
  onSuccess?: () => void;
}

export function FinancialMessageDialog({ open, onOpenChange, schoolSlug, onSuccess }: FinancialMessageDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOutstanding, setFilterOutstanding] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [channels, setChannels] = useState({ sms: true, email: true, inApp: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: { class: "min-h-[140px] p-3 outline-none prose prose-sm dark:prose-invert max-w-none text-sm" },
    },
  });

  useEffect(() => {
    if (!open) { setStep(1); setSelectedIds(new Set()); setResult(null); return; }
    fetchStudents();
  }, [open]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/students?includeBalance=true&limit=200`);
      const data = await res.json();
      const list = data.students || data || [];
      setStudents(list);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const name = `${s.profile?.firstName} ${s.profile?.lastName}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || s.studentId.toLowerCase().includes(search.toLowerCase());
    const matchBalance = !filterOutstanding || Number(s.outstandingBalance) > 0;
    return matchSearch && matchBalance;
  });

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleSend = async () => {
    const contentHtml = editor?.getHTML() || "";
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (!editor?.getText().trim()) { toast.error("Message content is required"); return; }
    if (!channels.sms && !channels.email && !channels.inApp) { toast.error("Select at least one channel"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/announcements/financial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: Array.from(selectedIds),
          subject,
          contentHtml,
          channels: [
            ...(channels.sms ? ["sms"] : []),
            ...(channels.email ? ["email"] : []),
            ...(channels.inApp ? ["inApp"] : []),
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      setResult(data.results);
      setStep(3);
      toast.success(`Message sent to ${data.results.totalGuardians} guardian(s)`);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStudents = students.filter((s) => selectedIds.has(s.id));
  const totalBalance = selectedStudents.reduce((sum, s) => sum + Number(s.outstandingBalance), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Financial Message to Parents
          </DialogTitle>
          <DialogDescription>
            Send targeted fee reminders to parents of selected students.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          {[{ n: 1, label: "Select Students" }, { n: 2, label: "Compose" }, { n: 3, label: "Done" }].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-1.5">
              <div className={cn("h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs", step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {step > n ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
              </div>
              <span className={cn("hidden sm:inline", step >= n ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</span>
              {n < 3 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          {/* ── Step 1: Student Selection ── */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer whitespace-nowrap">
                  <Switch checked={filterOutstanding} onCheckedChange={setFilterOutstanding} className="scale-75" />
                  Outstanding only
                </label>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{filteredStudents.length} student(s) shown</span>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAll} className="text-primary hover:underline">Select all</button>
                  <button type="button" onClick={clearAll} className="text-muted-foreground hover:underline">Clear</button>
                </div>
              </div>

              {loadingStudents ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto rounded-lg border p-1">
                  {filteredStudents.map((s) => {
                    const name = `${s.profile?.firstName} ${s.profile?.lastName}`;
                    const balance = Number(s.outstandingBalance);
                    const isSelected = selectedIds.has(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                        className={cn("w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors", isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50")}>
                        <div className="flex items-center gap-2.5">
                          <div className={cn("h-4 w-4 rounded border-2 flex items-center justify-center shrink-0", isSelected ? "bg-primary border-primary" : "border-muted-foreground/40")}>
                            {isSelected && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{name}</p>
                            <p className="text-xs text-muted-foreground">{s.studentId}{s.class ? ` • ${s.class.name}` : ""}</p>
                          </div>
                        </div>
                        {balance > 0 && (
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400">GHS {balance.toFixed(2)}</span>
                        )}
                      </button>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-6">No students found</p>
                  )}
                </div>
              )}

              {selectedIds.size > 0 && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{selectedIds.size} student(s) selected</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">Total: GHS {totalBalance.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Compose ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Subject</Label>
                <Input placeholder="e.g. Term 2 Fee Reminder" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">Message</Label>
                <div className="border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                  <EditorToolbar editor={editor} />
                  <EditorContent editor={editor} />
                </div>
              </div>

              {/* Channels */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-medium">Delivery Channels</p>
                {[
                  { key: "inApp", icon: Bell, label: "In-App Notification", color: "text-violet-500" },
                  { key: "sms", icon: MessageSquare, label: "SMS (Hubtel)", color: "text-blue-500" },
                  { key: "email", icon: Mail, label: "Email (Resend)", color: "text-indigo-500" },
                ].map(({ key, icon: Icon, label, color }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", color)} />
                      <span className="text-sm">{label}</span>
                    </div>
                    <Switch
                      checked={channels[key as keyof typeof channels]}
                      onCheckedChange={(v) => setChannels((c) => ({ ...c, [key]: v }))}
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Recipients Summary</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {selectedIds.size} student(s) selected. Messages will be sent to their primary guardians with <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">receiveAlerts = true</code>.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Result ── */}
          {step === 3 && result && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Message Sent!</p>
                  <p className="text-sm text-muted-foreground">Your financial message has been delivered.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Students", value: result.totalStudents, icon: Users, color: "text-violet-600" },
                  { label: "Guardians Reached", value: result.totalGuardians, icon: Users, color: "text-emerald-600" },
                  { label: "SMS Sent", value: result.smsSent, icon: MessageSquare, color: "text-blue-600" },
                  { label: "Emails Sent", value: result.emailSent, icon: Mail, color: "text-indigo-600" },
                  { label: "In-App", value: result.inAppSent, icon: Bell, color: "text-purple-600" },
                  { label: "Failed", value: (result.smsFailed || 0) + (result.emailFailed || 0), icon: AlertCircle, color: "text-red-600" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-lg border bg-card p-3 flex items-center gap-2">
                    <Icon className={cn("h-4 w-4 shrink-0", color)} />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={cn("text-lg font-bold", color)}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between gap-2 pt-3 border-t">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={selectedIds.size === 0}>
                Next: Compose →
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={handleSend} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send to {selectedIds.size} Student{selectedIds.size !== 1 ? "s" : ""}
              </Button>
            </>
          )}
          {step === 3 && (
            <Button className="w-full" onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
