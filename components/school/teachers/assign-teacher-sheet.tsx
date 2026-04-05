"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { 
  Loader2, 
  Plus, 
  Search, 
  BookOpen, 
  Building2, 
  Home,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { updateTeacherAssignments } from "@/app/(school)/[schoolSlug]/admin/teachers/[teacherId]/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AssignTeacherSheetProps {
  schoolSlug: string;
  teacher: {
    id: string;
    teacherId: string;
    profile: {
      firstName: string;
      lastName: string;
    } | null;
    departmentId: string;
    houseId: string | null;
    subjects: Array<{ subjectId: string }>;
  };
  departments: Array<{ id: string; name: string }>;
  houses: Array<{ id: string; name: string }>;
  allSubjects: Array<{ id: string; name: string; code: string }>;
  children?: React.ReactNode;
}

export function AssignTeacherSheet({
  schoolSlug,
  teacher,
  departments,
  houses,
  allSubjects,
  children,
}: AssignTeacherSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [departmentId, setDepartmentId] = useState(teacher.departmentId);
  const [houseId, setHouseId] = useState<string>(teacher.houseId || "none");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    teacher.subjects.map((s) => s.subjectId),
  );

  const filteredSubjects = useMemo(() => {
    return allSubjects.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [allSubjects, searchQuery]);

  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId],
    );
  };

  const handleSelectAll = () => {
    if (selectedSubjects.length === allSubjects.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(allSubjects.map((s) => s.id));
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await updateTeacherAssignments(schoolSlug, teacher.id, {
          departmentId,
          houseId: houseId === "none" ? null : houseId,
          subjectIds: selectedSubjects,
        });

        if (result.success) {
          toast.success("Assignments updated successfully", {
            description: "Teacher records have been refreshed.",
          });
          setOpen(false);
          router.refresh();
        } else {
          toast.error(result.error || "Failed to update assignments");
        }
      } catch (error) {
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2 rounded-xl border-primary/20 hover:bg-primary/5 transition-all">
            <Plus className="h-4 w-4" />
            Manage Assignments
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-[550px] flex flex-col h-full overflow-hidden p-0 border-l-primary/10">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Assign Responsibilities
          </SheetTitle>
          <SheetDescription>
            Configure departments, houses, and subject assignments for{" "}
            <span className="font-semibold text-foreground">
              {teacher.profile?.firstName} {teacher.profile?.lastName}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 min-h-0">
          <div className="flex-1 flex flex-col gap-6 py-6 overflow-hidden min-h-0">
            {/* Core assignments section */}
            <div className="space-y-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">
                  Primary Placement
                </h3>
              </div>

              <div className="grid gap-6 md:grid-cols-2 bg-muted/30 p-4 rounded-2xl border border-primary/5">
                <FieldGroup>
                  <FieldLabel htmlFor="department" className="text-xs font-semibold uppercase text-muted-foreground/70">Department</FieldLabel>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger id="department" className="bg-background/50 border-primary/10 rounded-xl">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="house" className="text-xs font-semibold uppercase text-muted-foreground/70">House (Optional)</FieldLabel>
                  <Select value={houseId} onValueChange={setHouseId}>
                    <SelectTrigger id="house" className="bg-background/50 border-primary/10 rounded-xl">
                      <SelectValue placeholder="Select house" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No House Assigned</SelectItem>
                      {houses.map((house) => (
                        <SelectItem key={house.id} value={house.id}>
                          {house.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>
            </div>

            {/* Subjects section */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">
                    Subject Assignments
                  </h3>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none px-3">
                  {selectedSubjects.length} of {allSubjects.length} Selected
                </Badge>
              </div>

              <div className="relative mb-3 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subjects by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/30 border-primary/5 rounded-xl focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-between px-2 mb-2 shrink-0">
                <button 
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-primary hover:underline transition-all"
                >
                  {selectedSubjects.length === allSubjects.length ? "Deselect All" : "Select All Available"}
                </button>
                {searchQuery && (
                  <span className="text-[10px] text-muted-foreground italic">
                    Showing {filteredSubjects.length} results
                  </span>
                )}
              </div>

              <div className="flex-1 border border-primary/10 rounded-2xl bg-muted/10 overflow-hidden flex flex-col min-h-0">
                <ScrollArea className="flex-1 px-4 min-h-0">
                  <div className="py-4 space-y-1">
                    {filteredSubjects.length > 0 ? (
                      filteredSubjects.map((subject) => {
                        const isSelected = selectedSubjects.includes(subject.id);
                        return (
                          <div 
                            key={subject.id} 
                            className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer hover:bg-white dark:hover:bg-slate-900 border ${isSelected ? 'border-primary/20 bg-primary/5 ring-1 ring-primary/5 shadow-sm' : 'border-transparent hover:border-muted-foreground/10'}`}
                            onClick={() => handleToggleSubject(subject.id)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`subject-${subject.id}`}
                                checked={isSelected}
                                onCheckedChange={() => handleToggleSubject(subject.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              <div className="grid gap-0.5 leading-none">
                                <label
                                  htmlFor={`subject-${subject.id}`}
                                  className="text-sm font-bold leading-none cursor-pointer group-hover:text-primary transition-colors"
                                >
                                  {subject.name}
                                </label>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {subject.code}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary animate-in zoom-in duration-200" />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
                        <XCircle className="h-8 w-8 mb-2" />
                        <p className="text-sm font-medium">No subjects matched your search</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="p-6 pt-4 border-t border-primary/5 bg-muted/5 backdrop-blur-sm">
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="flex-1 rounded-xl border-primary/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isPending}
              className="flex-1 rounded-xl shadow-lg shadow-primary/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Assignments"
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
