"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Users } from "lucide-react";
import { formatStudentName } from "@/lib/utils/name-formatter";

interface Student {
  id: string;
  profile: {
    firstName: string;
    lastName: string;
    otherNames?: string | null;
  };
}

interface RemarksDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  termId: string;
  schoolSlug: string;
}

export function RemarksDialog({
  isOpen,
  onOpenChange,
  students,
  termId,
  schoolSlug,
}: RemarksDialogProps) {
  const [remarkType, setRemarkType] = useState<string>("BEHAVIORAL");
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing remarks when dialog opens or remarkType changes
  useEffect(() => {
    if (isOpen && students.length > 0) {
      const fetchRemarks = async () => {
        setIsLoading(true);
        try {
          const newRemarks: Record<string, string> = {};
          
          await Promise.all(
            students.map(async (student) => {
              const res = await fetch(
                `/api/schools/${schoolSlug}/remarks?studentId=${student.id}&termId=${termId}`
              );
              if (res.ok) {
                const data = await res.json();
                const typeRemark = data.find((r: any) => r.remarkType === remarkType);
                if (typeRemark) {
                  newRemarks[student.id] = typeRemark.content;
                } else {
                  newRemarks[student.id] = "";
                }
              }
            })
          );
          
          setRemarks(newRemarks);
        } catch (error) {
          console.error("Failed to fetch remarks", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchRemarks();
    }
  }, [isOpen, remarkType, students, termId, schoolSlug]);

  const handleRemarkChange = (studentId: string, value: string) => {
    setRemarks((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      let successCount = 0;
      await Promise.all(
        Object.entries(remarks).map(async ([studentId, content]) => {
          if (!content.trim()) return; // Skip empty
          
          const res = await fetch(`/api/schools/${schoolSlug}/remarks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId,
              termId,
              remarkType,
              content,
            }),
          });
          
          if (res.ok) successCount++;
        })
      );
      
      toast.success(`Saved ${successCount} remarks successfully`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save some remarks");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Batch Student Remarks
              </DialogTitle>
              <DialogDescription>
                Enter behavioral or academic remarks for the selected class.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={remarkType} onValueChange={setRemarkType}>
                <SelectTrigger className="w-[200px] border-primary/20">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEHAVIORAL">Behavioral Remark</SelectItem>
                  <SelectItem value="ACADEMIC">Academic Remark</SelectItem>
                  <SelectItem value="GENERAL">General/Other</SelectItem>
                  <SelectItem value="ACHIEVEMENT">Achievements</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading existing remarks...</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[300px]">Student Name</TableHead>
                    <TableHead>Remark ({remarkType.toLowerCase()})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-semibold align-top pt-4">
                        {formatStudentName(
                          student.profile.firstName,
                          student.profile.lastName,
                          student.profile.otherNames
                        )}
                      </TableCell>
                      <TableCell className="pb-4 pt-2">
                        <Textarea
                          placeholder={`Enter ${remarkType.toLowerCase()} remark...`}
                          value={remarks[student.id] || ""}
                          onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                          className="min-h-[80px] focus-visible:ring-primary border-muted-foreground/20"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="p-6 pt-2 border-t flex justify-end gap-3 bg-muted/20">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving || isLoading} className="h-10 px-6">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save All Remarks
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
