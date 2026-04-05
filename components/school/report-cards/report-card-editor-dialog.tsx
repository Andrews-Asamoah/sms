"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save } from "lucide-react";

interface ReportCardEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: any;
  onSave: (updatedData: any) => Promise<void>;
}

export function ReportCardEditorDialog({
  open,
  onOpenChange,
  reportData,
  onSave,
}: ReportCardEditorDialogProps) {
  const [data, setData] = useState<any>(
    JSON.parse(JSON.stringify(reportData || {}))
  );
  const [saving, setSaving] = useState(false);

  // Initialize state when opened
  if (open && (!data || data.totalScore === undefined) && reportData) {
    setData(JSON.parse(JSON.stringify(reportData)));
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const updateSubject = (index: number, field: string, value: any) => {
    setData((prev: any) => {
      const newData = { ...prev };
      newData.subjects = [...prev.subjects];
      newData.subjects[index] = { ...newData.subjects[index], [field]: value };
      
      // Auto-calculate Total Score if Class Score or Exam Score change numerically
      if (field === "classWorkScore" || field === "examScore") {
        const cw = parseFloat(newData.subjects[index].classWorkScore) || 0;
        const ex = parseFloat(newData.subjects[index].examScore) || 0;
        newData.subjects[index].totalScore = (cw + ex).toString();
      }
      return newData;
    });
  };

  if (!data || !data.subjects) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Edit Report Card Data</DialogTitle>
          <DialogDescription>
            Manually override scores, remarks, or positioning. These changes will be reflected in both the web and PDF report cards.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="subjects" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b">
            <TabsList className="mb-[-1px]">
              <TabsTrigger value="subjects">Subjects & Scores</TabsTrigger>
              <TabsTrigger value="general">Remarks & Info</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-[60vh]">
              <TabsContent value="subjects" className="p-6 m-0 space-y-6">
                <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground mb-2 px-2">
                  <div className="col-span-3">Subject</div>
                  <div className="col-span-2 text-center">Class Score</div>
                  <div className="col-span-2 text-center">Exam Score</div>
                  <div className="col-span-2 text-center">Total</div>
                  <div className="col-span-3">Teacher's Remark</div>
                </div>
                {data.subjects.map((sub: any, i: number) => (
                  <div key={i} className="grid grid-cols-12 gap-4 items-center bg-muted/30 p-2 rounded-lg border border-border/50">
                    <div className="col-span-3 font-medium text-sm pl-2">
                      {sub.subjectName}
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        className="h-8 text-center"
                        value={sub.classWorkScore || ""}
                        onChange={(e) => updateSubject(i, "classWorkScore", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        className="h-8 text-center"
                        value={sub.examScore || ""}
                        onChange={(e) => updateSubject(i, "examScore", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="text"
                        className="h-8 text-center"
                        value={sub.totalScore || ""}
                        onChange={(e) => updateSubject(i, "totalScore", e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        className="h-8"
                        placeholder="Remark..."
                        value={sub.remarks || ""}
                        onChange={(e) => updateSubject(i, "remarks", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="general" className="p-6 m-0 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4 bg-muted/20 p-4 rounded-xl border">
                    <h3 className="font-semibold text-sm">Overall Performance</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Average (%)</Label>
                        <Input
                          type="number"
                          value={data.average || ""}
                          onChange={(e) => setData({ ...data, average: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Score</Label>
                        <Input
                          type="number"
                          value={data.totalScore || ""}
                          onChange={(e) => setData({ ...data, totalScore: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <Input
                          type="number"
                          value={data.position || ""}
                          onChange={(e) => setData({ ...data, position: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Position Suffix (st/nd/rd/th)</Label>
                        <Input
                          value={data.positionSuffix || ""}
                          onChange={(e) => setData({ ...data, positionSuffix: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Class Count</Label>
                        <Input
                          type="number"
                          value={data.classCount || ""}
                          onChange={(e) => setData({ ...data, classCount: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Attendance string</Label>
                        <Input
                          value={data.attendance || ""}
                          onChange={(e) => setData({ ...data, attendance: e.target.value })}
                          placeholder="e.g. 50 out of 60"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 bg-muted/20 p-4 rounded-xl border">
                    <h3 className="font-semibold text-sm">Remarks Override</h3>
                    <div className="space-y-2">
                      <Label>Headteacher's Remark</Label>
                      <Textarea
                        rows={3}
                        value={data.headteacherRemark || ""}
                        onChange={(e) => setData({ ...data, headteacherRemark: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 text-xs text-muted-foreground p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-md border border-blue-100 dark:border-blue-900 border-dashed">
                      <strong>Note:</strong> Class Teacher remarks are automatically pulled from the teacher portal for this term. If you need to override it entirely just for this card, you can manually add a "Class Teacher Remark" field here in code, but standard procedure is editing via the teacher portal.
                    </div>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>

        <DialogFooter className="p-6 pt-4 border-t bg-muted/10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
