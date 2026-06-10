"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Heart,
  Search,
  Download,
  Eye,
  Activity,
  ShieldAlert,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EditMedicalDialog } from "@/components/school/students/edit-medical-dialog";
import { toast } from "sonner";

interface StudentMedicalRow {
  id: string;
  studentId: string;
  admissionNumber: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    otherNames: string | null;
    gender: string;
    phone: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyRelationship: string | null;
  };
  class: { id: string; name: string } | null;
}

interface MedicalRecordsClientProps {
  schoolSlug: string;
  students: StudentMedicalRow[];
  classes: { id: string; name: string }[];
}

export function MedicalRecordsClient({
  schoolSlug,
  students,
  classes,
}: MedicalRecordsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("all");

  // Filter logic
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const fullName = `${student.profile.firstName} ${student.profile.lastName} ${student.profile.otherNames || ""}`.toLowerCase();
      const matchSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        (student.studentId && student.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (student.allergies && student.allergies.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (student.medicalConditions && student.medicalConditions.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchClass = selectedClass === "all" || student.class?.id === selectedClass;
      const matchBloodGroup = selectedBloodGroup === "all" || student.bloodGroup === selectedBloodGroup;

      return matchSearch && matchClass && matchBloodGroup;
    });
  }, [students, searchQuery, selectedClass, selectedBloodGroup]);

  // KPI calculations
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const critical = filteredStudents.filter((s) => s.medicalConditions && s.medicalConditions.trim() !== "").length;
    const allergies = filteredStudents.filter((s) => s.allergies && s.allergies.trim() !== "").length;

    // Blood groups breakdown
    const bgMap: Record<string, number> = {};
    filteredStudents.forEach((s) => {
      if (s.bloodGroup) {
        bgMap[s.bloodGroup] = (bgMap[s.bloodGroup] || 0) + 1;
      }
    });

    const topBloodGroup = Object.entries(bgMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    return { total, critical, allergies, topBloodGroup };
  }, [filteredStudents]);

  // CSV Export
  const handleExportCSV = () => {
    try {
      if (filteredStudents.length === 0) {
        toast.error("No records to export");
        return;
      }

      const headers = [
        "Student ID",
        "First Name",
        "Last Name",
        "Class",
        "Gender",
        "Blood Group",
        "Allergies",
        "Medical Conditions",
        "Emergency Contact Name",
        "Emergency Contact Phone",
        "Relationship",
      ];

      const csvRows = filteredStudents.map((s) => [
        `"${s.studentId}"`,
        `"${s.profile.firstName}"`,
        `"${s.profile.lastName}"`,
        `"${s.class?.name || "Not assigned"}"`,
        `"${s.profile.gender}"`,
        `"${s.bloodGroup || "—"}"`,
        `"${(s.allergies || "").replace(/"/g, '""')}"`,
        `"${(s.medicalConditions || "").replace(/"/g, '""')}"`,
        `"${(s.profile.emergencyContactName || "").replace(/"/g, '""')}"`,
        `"${s.profile.emergencyContactPhone || ""}"`,
        `"${s.profile.emergencyRelationship || ""}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Student_Medical_Records_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("CSV export downloaded successfully");
    } catch (error) {
      console.error("[CSV Export] Error:", error);
      toast.error("Failed to export CSV");
    }
  };

  const getInitials = (first: string, last: string) => {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-8 w-8 text-rose-500 fill-rose-500 animate-pulse" />
            Medical Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Track student medical conditions, allergies, and emergency contacts
          </p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="gap-2 border-border/80">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="backdrop-blur-sm bg-card/50 border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Total Medical Records
            </CardTitle>
            <Heart className="h-5 w-5 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Students with medical profiles</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Medical Conditions
            </CardTitle>
            <Activity className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.critical}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Students with medical conditions</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Allergies Recorded
            </CardTitle>
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {stats.allergies}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Students with food/drug allergies</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Top Blood Group
            </CardTitle>
            <Users className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.topBloodGroup}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Most common blood type</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table Card */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Students Directory</CardTitle>
              <CardDescription>
                Filter and search students with medical notes
              </CardDescription>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/50 border-border/70"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:inline" />
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full sm:w-[150px] bg-background/50 border-border/70">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedBloodGroup} onValueChange={setSelectedBloodGroup}>
                  <SelectTrigger className="w-full sm:w-[130px] bg-background/50 border-border/70">
                    <SelectValue placeholder="Blood Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-4 px-6">Student</th>
                  <th className="py-4 px-4">Class</th>
                  <th className="py-4 px-4">Blood Group</th>
                  <th className="py-4 px-4">Allergies</th>
                  <th className="py-4 px-4">Medical Conditions</th>
                  <th className="py-4 px-4">Emergency Contact</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Heart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="font-semibold text-base">No medical records found</p>
                      <p className="text-sm text-muted-foreground/75 mt-0.5">
                        Try modifying your search or filter criteria
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-accent/40 transition-colors">
                      {/* Student details */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border shadow-sm ring-1 ring-border">
                            <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/30 text-primary font-semibold text-xs">
                              {getInitials(student.profile.firstName, student.profile.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-foreground">
                              {student.profile.firstName} {student.profile.lastName}
                            </p>
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">
                              {student.studentId}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-4 px-4 font-medium text-foreground">
                        {student.class?.name || (
                          <span className="text-muted-foreground italic text-xs">Not assigned</span>
                        )}
                      </td>

                      {/* Blood Group */}
                      <td className="py-4 px-4">
                        {student.bloodGroup ? (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 font-semibold px-2 py-0.5 text-xs">
                            {student.bloodGroup}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>

                      {/* Allergies */}
                      <td className="py-4 px-4 max-w-[200px]">
                        {student.allergies ? (
                          <div className="space-y-1">
                            <p className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 inline-block">
                              Allergy
                            </p>
                            <p className="text-xs text-foreground line-clamp-2">{student.allergies}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs italic">None recorded</span>
                        )}
                      </td>

                      {/* Medical conditions */}
                      <td className="py-4 px-4 max-w-[200px]">
                        {student.medicalConditions ? (
                          <div className="space-y-1">
                            <p className="text-xs text-rose-700 font-semibold bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 inline-block">
                              Condition
                            </p>
                            <p className="text-xs text-foreground line-clamp-2">{student.medicalConditions}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs italic">None recorded</span>
                        )}
                      </td>

                      {/* Emergency contact */}
                      <td className="py-4 px-4">
                        {student.profile.emergencyContactName ? (
                          <div className="space-y-0.5 text-xs">
                            <p className="font-bold text-foreground">
                              {student.profile.emergencyContactName}
                            </p>
                            <p className="text-muted-foreground">
                              {student.profile.emergencyRelationship || "Contact"} · {student.profile.emergencyContactPhone || ""}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs italic">None recorded</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EditMedicalDialog
                            studentId={student.id}
                            studentName={`${student.profile.firstName} ${student.profile.lastName}`}
                            schoolSlug={schoolSlug}
                            initialData={{
                              bloodGroup: student.bloodGroup,
                              allergies: student.allergies,
                              medicalConditions: student.medicalConditions,
                              emergencyContactName: student.profile.emergencyContactName,
                              emergencyContactPhone: student.profile.emergencyContactPhone,
                              emergencyRelationship: student.profile.emergencyRelationship,
                            }}
                            trigger={
                              <Button variant="ghost" size="sm" className="h-8 hover:text-rose-600 hover:bg-rose-50/50">
                                Edit Info
                              </Button>
                            }
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" asChild>
                            <Link href={`/${schoolSlug}/admin/students/${student.id}`} title="View Student Profile">
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
