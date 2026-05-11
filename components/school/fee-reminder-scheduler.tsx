"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Loader2, Calendar, Clock, Bell, MessageSquare, Mail, Play,
  Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, CheckCircle2,
  AlertCircle, ClipboardList, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;
  const btn = (action: () => void, label: string, active?: boolean) => (
    <button type="button" onClick={action}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{label}</button>
  );
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/40 rounded-t-md">
      {btn(() => editor.chain().focus().toggleBold().run(), "B", editor.isActive("bold"))}
      {btn(() => editor.chain().focus().toggleItalic().run(), "I", editor.isActive("italic"))}
      <div className="w-px bg-border mx-1" />
      {btn(() => editor.chain().focus().toggleBulletList().run(), "• List", editor.isActive("bulletList"))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), "1. List", editor.isActive("orderedList"))}
    </div>
  );
}

const VARIABLE_HINTS = ["{{studentName}}", "{{outstandingBalance}}", "{{dueDate}}", "{{installmentLabel}}"];

interface Schedule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sendSms: boolean;
  sendEmail: boolean;
  sendInApp: boolean;
  minimumOutstanding: number;
  createdAt: string;
  academicYear?: { name: string } | null;
  term?: { name: string } | null;
  createdBy: { name: string };
  installments: Installment[];
  _count?: { logs: number };
}

interface Installment {
  id: string;
  label: string;
  dueDate: string;
  sendDate: string;
  sent: boolean;
  sentAt?: string | null;
}

export function FeeReminderScheduler() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [triggerTarget, setTriggerTarget] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/fee-reminders`);
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch { toast.error("Failed to load schedules"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSchedules(); }, [schoolSlug]);

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/schools/${schoolSlug}/fee-reminders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      setSchedules((prev) => prev.map((s) => s.id === id ? { ...s, isActive: !current } : s));
      toast.success(!current ? "Schedule activated" : "Schedule paused");
    } catch { toast.error("Failed to update schedule"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/schools/${schoolSlug}/fee-reminders/${deleteTarget}`, { method: "DELETE" });
      setSchedules((prev) => prev.filter((s) => s.id !== deleteTarget));
      toast.success("Schedule deleted");
    } catch { toast.error("Failed to delete"); }
    finally { setDeleteTarget(null); }
  };

  const handleTrigger = async () => {
    if (!triggerTarget) return;
    setTriggering(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/fee-reminders/${triggerTarget}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Manual trigger complete: ${data.result?.smsSent || 0} SMS, ${data.result?.emailSent || 0} emails, ${data.result?.inAppSent || 0} in-app sent`);
      fetchSchedules();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Trigger failed");
    } finally {
      setTriggering(false);
      setTriggerTarget(null);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="Fee Reminder Schedules"
        description="Automate payment reminders to parents via SMS, Email, and In-App notifications."
      >
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />New Schedule
        </Button>
      </DashboardPageHeader>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed bg-muted/20 gap-3">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-base font-medium text-muted-foreground">No schedules yet</p>
          <p className="text-sm text-muted-foreground/70">Create a fee reminder schedule to automate parent notifications.</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create First Schedule</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => {
            const isExpanded = expandedId === schedule.id;
            const sentCount = schedule.installments.filter((i) => i.sent).length;
            const pendingCount = schedule.installments.filter((i) => !i.sent).length;

            return (
              <div key={schedule.id} className={cn("rounded-xl border bg-card overflow-hidden transition-all", schedule.isActive ? "border-border" : "opacity-70 border-dashed")}>
                {/* Card header */}
                <div className="p-4 flex items-start gap-3">
                  <div className={cn("mt-0.5 h-10 w-10 rounded-full flex items-center justify-center shrink-0", schedule.isActive ? "bg-emerald-100 dark:bg-emerald-950" : "bg-muted")}>
                    <Bell className={cn("h-5 w-5", schedule.isActive ? "text-emerald-600" : "text-muted-foreground")} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{schedule.name}</h3>
                      <Badge variant={schedule.isActive ? "default" : "secondary"} className="text-[10px]">
                        {schedule.isActive ? "Active" : "Paused"}
                      </Badge>
                      {schedule.term && <Badge variant="outline" className="text-[10px]">{schedule.term.name}</Badge>}
                    </div>
                    {schedule.description && <p className="text-xs text-muted-foreground mt-0.5">{schedule.description}</p>}

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {schedule.sendSms && <span className="flex items-center gap-1 text-[10px] text-blue-600"><MessageSquare className="h-3 w-3" />SMS</span>}
                      {schedule.sendEmail && <span className="flex items-center gap-1 text-[10px] text-indigo-600"><Mail className="h-3 w-3" />Email</span>}
                      {schedule.sendInApp && <span className="flex items-center gap-1 text-[10px] text-violet-600"><Bell className="h-3 w-3" />In-App</span>}
                      <span className="text-[10px] text-muted-foreground">{schedule.installments.length} installment(s)</span>
                      <span className="text-[10px] text-muted-foreground">{sentCount} sent • {pendingCount} pending</span>
                      {(schedule._count?.logs || 0) > 0 && (
                        <span className="text-[10px] text-muted-foreground">{schedule._count?.logs} log entries</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleActive(schedule.id, schedule.isActive)}
                      title={schedule.isActive ? "Pause" : "Activate"}>
                      {schedule.isActive ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setTriggerTarget(schedule.id)}>
                      <Play className="mr-1 h-3 w-3" />Test
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(schedule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedId(isExpanded ? null : schedule.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded installments */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Installments</p>
                    {schedule.installments.map((inst, idx) => (
                      <div key={inst.id} className={cn("flex items-center gap-3 p-3 rounded-lg border bg-card", inst.sent && "opacity-60")}>
                        <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0", inst.sent ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary")}>
                          {inst.sent ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{inst.label}</p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due: {format(new Date(inst.dueDate), "d MMM yyyy")}</span>
                            <span className="flex items-center gap-1"><Send className="h-3 w-3" />Sends: {format(new Date(inst.sendDate), "d MMM yyyy")}</span>
                          </div>
                        </div>
                        {inst.sent && (
                          <Badge variant="secondary" className="text-[10px]">
                            Sent {inst.sentAt ? format(new Date(inst.sentAt), "d MMM") : ""}
                          </Badge>
                        )}
                        {!inst.sent && new Date(inst.sendDate) <= new Date() && (
                          <Badge className="text-[10px] bg-amber-500">Due Today</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateScheduleDialog open={createOpen} onOpenChange={setCreateOpen} schoolSlug={schoolSlug} onSuccess={fetchSchedules} />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
            <AlertDialogDescription>All installment records and logs will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Trigger confirm */}
      <AlertDialog open={!!triggerTarget} onOpenChange={() => setTriggerTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send test reminder now?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately send reminders to all parents of students with outstanding balances. Use this to test your schedule before the automatic send date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={triggering}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTrigger} disabled={triggering}>
              {triggering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Create Dialog ────────────────────────────────────────────────────────────
function CreateScheduleDialog({ open, onOpenChange, schoolSlug, onSuccess }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schoolSlug: string;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "", description: "", sendSms: true, sendEmail: true, sendInApp: true,
    targetOutstandingOnly: true, minimumOutstanding: 0, installmentCount: 1,
    smsTemplate: "",
  });
  const [installments, setInstallments] = useState([{ label: "1st Installment", dueDate: "", sendDate: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: "<p>Dear {{studentName}},</p><p>This is a reminder that your ward has an outstanding balance of <strong>{{outstandingBalance}}</strong> due on {{dueDate}} for the {{installmentLabel}}.</p><p>Please contact the accounts office to make arrangements.</p>",
    editorProps: { attributes: { class: "min-h-[140px] p-3 outline-none prose prose-sm dark:prose-invert max-w-none text-sm" } },
  });

  useEffect(() => {
    if (!open) return;
    setForm({ name: "", description: "", sendSms: true, sendEmail: true, sendInApp: true, targetOutstandingOnly: true, minimumOutstanding: 0, installmentCount: 1, smsTemplate: "" });
    setInstallments([{ label: "1st Installment", dueDate: "", sendDate: "" }]);
  }, [open]);

  const updateInstallmentCount = (count: number) => {
    setForm((f) => ({ ...f, installmentCount: count }));
    const labels = ["1st Installment", "2nd Installment", "Final Notice"];
    setInstallments(Array.from({ length: count }, (_, i) => ({
      label: labels[i] || `Installment ${i + 1}`, dueDate: "", sendDate: "",
    })));
  };

  const handleSubmit = async () => {
    const messageTemplate = editor?.getHTML() || "";
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!messageTemplate || editor?.getText().trim() === "") { toast.error("Message template is required"); return; }
    const invalid = installments.some((i) => !i.dueDate || !i.sendDate);
    if (invalid) { toast.error("All installments need due and send dates"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/fee-reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, messageTemplate, smsTemplate: form.smsTemplate || undefined, installments }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Schedule created successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Fee Reminder Schedule</DialogTitle>
          <DialogDescription>Set up automated payment reminders for parents with outstanding fees.</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-5 pr-1">
          {/* Basic info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Schedule Name *</Label>
              <Input placeholder="e.g. Term 2 2025 Reminders" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input placeholder="Brief description..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          {/* Installment count */}
          <div className="space-y-1.5">
            <Label>Number of Installments</Label>
            <Select value={String(form.installmentCount)} onValueChange={(v) => updateInstallmentCount(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 (Single payment)</SelectItem>
                <SelectItem value="2">2 (Two installments)</SelectItem>
                <SelectItem value="3">3 (Three installments)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Installments */}
          <div className="space-y-3">
            <Label>Installment Schedule</Label>
            {installments.map((inst, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                  <Input placeholder="Label, e.g. 1st Installment" value={inst.label}
                    onChange={(e) => setInstallments((prev) => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Due Date</Label>
                    <Input type="date" value={inst.dueDate} onChange={(e) => setInstallments((prev) => prev.map((x, j) => j === i ? { ...x, dueDate: e.target.value } : x))} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Send Reminder On</Label>
                    <Input type="date" value={inst.sendDate} onChange={(e) => setInstallments((prev) => prev.map((x, j) => j === i ? { ...x, sendDate: e.target.value } : x))} className="h-8 text-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message template */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Message Template *</Label>
              <div className="flex gap-1 flex-wrap">
                {VARIABLE_HINTS.map((v) => (
                  <button key={v} type="button" onClick={() => editor?.chain().focus().insertContent(v).run()}
                    className="text-[10px] bg-muted hover:bg-muted/80 px-1.5 py-0.5 rounded font-mono transition-colors">{v}</button>
                ))}
              </div>
            </div>
            <div className="border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
              <EditorToolbar editor={editor} />
              <EditorContent editor={editor} />
            </div>
            <p className="text-xs text-muted-foreground">Click variable hints above to insert them into the message.</p>
          </div>

          {/* SMS override */}
          <div className="space-y-1.5">
            <Label>SMS Template Override (optional, max 160 chars)</Label>
            <Input
              placeholder="Leave blank to auto-generate from message template"
              value={form.smsTemplate}
              maxLength={160}
              onChange={(e) => setForm((f) => ({ ...f, smsTemplate: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">{form.smsTemplate.length}/160 characters. Supports same variables.</p>
          </div>

          {/* Settings */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium">Delivery & Targeting Settings</p>
            {[
              { key: "sendSms", icon: MessageSquare, label: "Send via SMS", color: "text-blue-500" },
              { key: "sendEmail", icon: Mail, label: "Send via Email", color: "text-indigo-500" },
              { key: "sendInApp", icon: Bell, label: "Send In-App notifications", color: "text-violet-500" },
              { key: "targetOutstandingOnly", icon: AlertCircle, label: "Only target students with outstanding balance", color: "text-orange-500" },
            ].map(({ key, icon: Icon, label, color }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", color)} />
                  <span className="text-sm">{label}</span>
                </div>
                <Switch checked={form[key as keyof typeof form] as boolean} onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Label className="text-sm whitespace-nowrap">Min. outstanding (GHS)</Label>
              <Input type="number" min="0" step="0.01" value={form.minimumOutstanding}
                onChange={(e) => setForm((f) => ({ ...f, minimumOutstanding: Number(e.target.value) }))} className="h-8 w-28" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Schedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
