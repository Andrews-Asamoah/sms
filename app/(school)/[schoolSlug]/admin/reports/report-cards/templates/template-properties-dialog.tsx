"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateTemplateProperties } from "./actions";

interface TemplatePropertiesDialogProps {
  template: any;
  departments: any[];
  schoolSlug: string;
}

export function TemplatePropertiesDialog({
  template,
  departments,
  schoolSlug,
}: TemplatePropertiesDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departmentId, setDepartmentId] = useState<string>(
    template.departmentId || "none"
  );

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateTemplateProperties(template.id, schoolSlug, {
        departmentId: departmentId === "none" ? null : departmentId,
      });
      toast.success("Template properties updated");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update properties");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1 text-xs text-primary bg-primary/5 hover:bg-primary/10 border-primary/20">
          Properties
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Template Properties</DialogTitle>
          <DialogDescription>
            Configure properties for &quot;{template.name}&quot;
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="level" className="font-semibold text-sm">Target Level / Department</Label>
            <p className="text-xs text-muted-foreground">
              Link this template to a specific school section (e.g., Primary, JHS). 
              This tells the system which dynamic rubrics (like SEL or Discipline tracks) 
              to inject into the generated report cards.
            </p>
            <Select
              value={departmentId}
              onValueChange={setDepartmentId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a department level..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific level</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
