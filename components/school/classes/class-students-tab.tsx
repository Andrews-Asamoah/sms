"use client";

import {
  Search,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  ArrowRightLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface StudentProfile {
  firstName: string;
  lastName: string;
  image: string | null;
}

interface EnrolledStudent {
  id: string;
  studentId: string;
  admissionNumber: string | null;
  profile: StudentProfile;
  status: string;
}

interface AvailableStudent {
  id: string;
  studentId: string;
  profile: StudentProfile;
}

interface StudentInOtherClass extends AvailableStudent {
  currentClassName: string | null;
}

interface ClassStudentsTabProps {
  schoolSlug: string;
  classId: string;
  students: EnrolledStudent[];
  unassignedStudents: AvailableStudent[];
  studentsInOtherClasses: StudentInOtherClass[];
}

export function ClassStudentsTab({
  schoolSlug,
  classId,
  students,
  unassignedStudents,
  studentsInOtherClasses,
}: ClassStudentsTabProps) {
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const filteredEnrolled = students.filter(
    (s) =>
      `${s.profile.firstName} ${s.profile.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      s.studentId.toLowerCase().includes(search.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(search.toLowerCase()),
  );

  const dialogSearch = search && isAdding ? search : "";

  const filteredUnassigned = unassignedStudents.filter(
    (s) =>
      `${s.profile.firstName} ${s.profile.lastName}`
        .toLowerCase()
        .includes(dialogSearch.toLowerCase()) ||
      s.studentId.toLowerCase().includes(dialogSearch.toLowerCase()),
  );

  const filteredInOtherClasses = studentsInOtherClasses.filter(
    (s) =>
      `${s.profile.firstName} ${s.profile.lastName}`
        .toLowerCase()
        .includes(dialogSearch.toLowerCase()) ||
      s.studentId.toLowerCase().includes(dialogSearch.toLowerCase()),
  );

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleEnroll = async () => {
    if (selectedStudents.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/classes/${classId}/enroll`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentIds: selectedStudents }),
        },
      );

      if (!response.ok) throw new Error("Failed to enroll students");

      toast.success("Success", {
        description: `Successfully enrolled ${selectedStudents.length} student(s).`,
      });
      setIsAdding(false);
      setSelectedStudents([]);
      router.refresh();
    } catch {
      toast.error("Error", {
        description: "Failed to enroll students. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnenroll = async (studentId: string) => {
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/classes/${classId}/unenroll`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId }),
        },
      );

      if (!response.ok) throw new Error("Failed to unenroll student");

      toast.success("Student unenrolled");
      router.refresh();
    } catch {
      toast.error("Error", {
        description: "Failed to remove student from class.",
      });
    }
  };

  const totalAvailable = unassignedStudents.length + studentsInOtherClasses.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Enrolled Students</h2>
          <p className="text-sm text-muted-foreground">
            {students.length} students currently enrolled in this class
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64 lg:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Students
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Enroll / Move Students</DialogTitle>
                <DialogDescription>
                  Select students to add to this class. Students from other
                  classes will be moved here.
                </DialogDescription>
              </DialogHeader>

              <div className="relative my-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  className="pl-8"
                  value={dialogSearch}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto py-2 space-y-6">
                {totalAvailable === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="font-medium">All students are assigned</p>
                    <p className="text-sm text-muted-foreground">
                      There are no other students in the school.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Unassigned students */}
                    {filteredUnassigned.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                          Unassigned Students
                        </p>
                        <div className="grid grid-cols-[40px_1fr_1fr] px-4 py-2 border-b text-sm font-medium">
                          <div></div>
                          <div>Student Name</div>
                          <div>Student ID</div>
                        </div>
                        {filteredUnassigned.map((student) => (
                          <div
                            key={student.id}
                            className="grid grid-cols-[40px_1fr_1fr] items-center px-4 py-2 hover:bg-muted/50 rounded-md transition-colors"
                          >
                            <Checkbox
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={() =>
                                handleToggleStudent(student.id)
                              }
                            />
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={student.profile.image || ""} />
                                <AvatarFallback>
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium truncate">
                                {student.profile.firstName}{" "}
                                {student.profile.lastName}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {student.studentId}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Students in other classes */}
                    {filteredInOtherClasses.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Move from Another Class
                          </p>
                        </div>
                        <div className="grid grid-cols-[40px_1fr_1fr_auto] px-4 py-2 border-b text-sm font-medium">
                          <div></div>
                          <div>Student Name</div>
                          <div>Student ID</div>
                          <div>Current Class</div>
                        </div>
                        {filteredInOtherClasses.map((student) => (
                          <div
                            key={student.id}
                            className="grid grid-cols-[40px_1fr_1fr_auto] items-center px-4 py-2 hover:bg-muted/50 rounded-md transition-colors"
                          >
                            <Checkbox
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={() =>
                                handleToggleStudent(student.id)
                              }
                            />
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={student.profile.image || ""} />
                                <AvatarFallback>
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium truncate">
                                {student.profile.firstName}{" "}
                                {student.profile.lastName}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {student.studentId}
                            </span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {student.currentClassName ?? "Unknown"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={selectedStudents.length === 0 || loading}
                  onClick={handleEnroll}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enroll {selectedStudents.length} Student
                  {selectedStudents.length !== 1 ? "s" : ""}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Photo</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnrolled.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No students currently enrolled.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEnrolled.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={student.profile.image || ""} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.profile.firstName} {student.profile.lastName}
                    </TableCell>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>{student.admissionNumber || "N/A"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          student.status.toLowerCase() === "active" ? "secondary" : "outline"
                        }
                        className="capitalize"
                      >
                        {student.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleUnenroll(student.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
