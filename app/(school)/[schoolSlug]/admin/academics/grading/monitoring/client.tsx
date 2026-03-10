"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  Lock, 
  Unlock, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Filter,
  Loader2
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toggleTemplateLock, extendDeadline } from "./actions";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface MonitoringClientProps {
  initialData: any[];
  terms: any[];
  selectedTermId: string | undefined;
  schoolSlug: string;
}

export function MonitoringClient({ initialData, terms, selectedTermId, schoolSlug }: MonitoringClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Extension Dialog State
  const [extensionDialog, setExtensionDialog] = useState<{
    isOpen: boolean;
    templateId: string | null;
    templateName: string;
    classId: string | null; // null means all classes
    className: string;
    currentDeadline: Date | null;
  }>({
    isOpen: false,
    templateId: null,
    templateName: "",
    classId: null,
    className: "",
    currentDeadline: null,
  });

  const [newDeadline, setNewDeadline] = useState<Date | undefined>(undefined);

  const handleTermChange = (id: string) => {
    router.push(`/${schoolSlug}/admin/academics/grading/monitoring?termId=${id}`);
  };

  const handleToggleLock = async (templateId: string, currentStatus: boolean) => {
    setIsUpdating(true);
    try {
      const result = await toggleTemplateLock(schoolSlug, templateId, !currentStatus);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to update lock status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenExtension = (template: any, classItem?: any) => {
    setExtensionDialog({
      isOpen: true,
      templateId: template.id,
      templateName: template.name,
      classId: classItem ? classItem.id : null,
      className: classItem ? classItem.name : "All Classes",
      currentDeadline: template.deadline ? new Date(template.deadline) : null,
    });
    setNewDeadline(template.deadline ? new Date(template.deadline) : new Date());
  };

  const handleConfirmExtension = async () => {
    if (!extensionDialog.templateId || !newDeadline) return;
    
    setIsUpdating(true);
    try {
      const result = await extendDeadline(
        schoolSlug, 
        extensionDialog.templateId, 
        newDeadline, 
        extensionDialog.classId || undefined
      );
      
      if (result.success) {
        toast.success(result.message);
        setExtensionDialog(prev => ({ ...prev, isOpen: false }));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to extend deadline");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-background p-4 rounded-lg border shadow-sm">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1 flex items-center gap-4">
          <div className="w-[250px]">
            <Select value={selectedTermId} onValueChange={handleTermChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.isCurrent && "(Current)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.map(template => (
          <Card key={template.id} className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all shadow-md">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{template.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    Deadline: {template.deadline ? format(new Date(template.deadline), "PPP p") : "Not set"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={template.isLocked ? "destructive" : "secondary"} className="flex gap-1 items-center px-2 py-1">
                    {template.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    {template.isLocked ? "Locked" : "Unlocked"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleLock(template.id, template.isLocked)}>
                        {template.isLocked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                        {template.isLocked ? "Unlock Assessment" : "Lock Assessment"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenExtension(template)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Modify Global Deadline
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Force Reset Progress
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-4">
                {template.classProgress.map((cls: any) => {
                  const percentage = cls.totalStudents > 0 ? (cls.filledStudents / cls.totalStudents) * 100 : 0;
                  const isSubmitted = cls.submittedStudents === cls.totalStudents && cls.totalStudents > 0;
                  
                  return (
                    <div key={cls.id} className="space-y-1.5 p-3 rounded-lg border bg-card/50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{cls.name}</span>
                          {isSubmitted ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-none hover:bg-emerald-100 h-5 px-1.5">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              All Submitted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                              {cls.filledStudents}/{cls.totalStudents} Filled
                            </Badge>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 hover:opacity-100">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenExtension(template, cls)}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Extend for this Class
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={`/${schoolSlug}/admin/academics/grading/monitoring/review/${template.id}/${cls.id}`}>
                                <ChevronRight className="h-4 w-4 mr-2" />
                                Review Records
                              </a>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={percentage} className="h-2 flex-1" />
                        <span className="text-[10px] font-mono font-bold whitespace-nowrap">{Math.round(percentage)}%</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                        <span>Submitted: {cls.submittedStudents} students</span>
                        <span>{cls.totalStudents - cls.filledStudents} pending</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.length === 0 && (
        <div className="flex flex-col items-center justify-center p-20 bg-background border-2 border-dashed rounded-xl">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold">No assessments found for this term</h3>
          <p className="text-muted-foreground">Create assessment templates to start monitoring progress.</p>
        </div>
      )}

      {/* Extension Dialog */}
      <Dialog open={extensionDialog.isOpen} onOpenChange={(open) => setExtensionDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Extend Deadline</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Subject/Template</label>
              <p className="text-base font-semibold">{extensionDialog.templateName}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Target</label>
              <p className="text-base font-semibold">{extensionDialog.className}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Deadline</label>
              <DatePicker 
                date={newDeadline} 
                setDate={(date) => setNewDeadline(date)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtensionDialog(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button onClick={handleConfirmExtension} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set New Deadline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
