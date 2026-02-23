"use client";

import { useState, useTransition } from "react";
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
import { Loader2, Plus } from "lucide-react";
import { updateTeacherAssignments } from "@/app/(school)/[schoolSlug]/admin/teachers/[teacherId]/actions";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Form state
  const [departmentId, setDepartmentId] = useState(teacher.departmentId);
  const [houseId, setHouseId] = useState<string>(teacher.houseId || "none");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    teacher.subjects.map((s) => s.subjectId),
  );

  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId],
    );
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
          toast.success(result.message);
          setOpen(false);
          router.refresh();
        } else {
          toast.error(result.error);
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
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Manage Assignments
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-[500px] flex flex-col h-full">
        <SheetHeader>
          <SheetTitle>Manage Assignments</SheetTitle>
          <SheetDescription>
            Update assignments for {teacher.profile?.firstName}{" "}
            {teacher.profile?.lastName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6 py-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Core Assignments
            </h3>

            <FieldGroup>
              <FieldLabel htmlFor="department">Department</FieldLabel>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger id="department">
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
              <FieldLabel htmlFor="house">House (Optional)</FieldLabel>
              <Select value={houseId} onValueChange={setHouseId}>
                <SelectTrigger id="house">
                  <SelectValue placeholder="Select house" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {houses.map((house) => (
                    <SelectItem key={house.id} value={house.id}>
                      {house.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>
          </div>

          <div className="flex-1 flex flex-col min-h-0 gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Assigned Subjects
              <span className="text-xs font-normal normal-case">
                {selectedSubjects.length} selected
              </span>
            </h3>

            <ScrollArea className="flex-1 border rounded-md p-4">
              <div className="space-y-4">
                {allSubjects.map((subject) => (
                  <div key={subject.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={`subject-${subject.id}`}
                      checked={selectedSubjects.includes(subject.id)}
                      onCheckedChange={() => handleToggleSubject(subject.id)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={`subject-${subject.id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {subject.name}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {subject.code}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <SheetFooter className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
