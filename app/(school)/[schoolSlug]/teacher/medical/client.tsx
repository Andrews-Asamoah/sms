"use client";

import { useState, useMemo } from "react";
import {
  Heart,
  Search,
  Phone,
  User,
  SlidersHorizontal,
  AlertTriangle,
  Activity,
  HeartHandshake,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface StudentMedical {
  id: string;
  studentId: string;
  bloodGroup: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    otherNames: string | null;
    gender: string;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyRelationship: string | null;
    user: {
      image: string | null;
    };
  };
  class: { id: string; name: string } | null;
}

interface TeacherMedicalClientProps {
  schoolSlug: string;
  students: StudentMedical[];
  classes: { id: string; name: string }[];
}

export function TeacherMedicalClient({
  schoolSlug,
  students,
  classes,
}: TeacherMedicalClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");

  // Filtering
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const fullName = `${student.profile.firstName} ${student.profile.lastName} ${student.profile.otherNames || ""}`.toLowerCase();
      const matchSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        (student.studentId && student.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (student.allergies && student.allergies.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (student.medicalConditions && student.medicalConditions.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchClass = selectedClass === "all" || student.class?.id === selectedClass;

      return matchSearch && matchClass;
    });
  }, [students, searchQuery, selectedClass]);

  const getInitials = (first: string, last: string) => {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="h-8 w-8 text-rose-500 fill-rose-500" />
          Student Health
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor medical alerts and emergency contacts for students in your classes
        </p>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 border border-border/60 p-4 rounded-2xl backdrop-blur-sm">
        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student name, condition..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 border-border/80"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-border/80">
              <SelectValue placeholder="Filter by Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All My Classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid of Medical Cards */}
      {filteredStudents.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/40 py-16 text-center">
          <CardContent className="space-y-3">
            <HeartHandshake className="h-12 w-12 mx-auto text-muted-foreground/40 stroke-[1.5]" />
            <p className="font-semibold text-lg text-muted-foreground">No student medical alerts found</p>
            <p className="text-sm text-muted-foreground/75 max-w-sm mx-auto">
              There are no active students in the selected class matching your search query with medical details.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => (
            <Card
              key={student.id}
              className="backdrop-blur-sm bg-card/50 border-border/50 shadow-sm rounded-2xl overflow-hidden hover:shadow-md hover:border-border transition-all duration-200"
            >
              {/* Card Header with Student Details */}
              <CardHeader className="bg-muted/20 border-b border-border/40 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm ring-1 ring-border">
                      <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/30 text-primary font-bold text-sm">
                        {getInitials(student.profile.firstName, student.profile.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-base text-foreground leading-snug">
                        {student.profile.firstName} {student.profile.lastName}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Class: <span className="font-semibold text-foreground">{student.class?.name || "—"}</span>
                      </p>
                    </div>
                  </div>

                  {student.bloodGroup ? (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 font-bold px-2 py-0.5 text-xs">
                      {student.bloodGroup}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-xs font-normal">
                      No Blood Group
                    </Badge>
                  )}
                </div>
              </CardHeader>

              {/* Card Body */}
              <CardContent className="pt-5 space-y-4">
                {/* Allergies Alerts */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Allergies
                  </div>
                  {student.allergies ? (
                    <p className="text-sm bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3 text-foreground font-medium">
                      {student.allergies}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-5">No allergies reported</p>
                  )}
                </div>

                {/* Medical Conditions */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                    <Activity className="h-3.5 w-3.5 shrink-0" />
                    Medical Conditions
                  </div>
                  {student.medicalConditions ? (
                    <p className="text-sm bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl p-3 text-foreground font-medium">
                      {student.medicalConditions}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-5">No conditions reported</p>
                  )}
                </div>

                {/* Emergency Contacts */}
                <div className="pt-3 border-t border-border/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    Emergency Contact
                  </div>

                  {student.profile.emergencyContactName ? (
                    <div className="bg-muted/40 rounded-xl p-3 flex justify-between items-center gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {student.profile.emergencyContactName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {student.profile.emergencyRelationship || "Contact"}
                        </p>
                      </div>
                      {student.profile.emergencyContactPhone && (
                        <Button size="icon" variant="outline" className="h-9 w-9 rounded-full bg-background border-border/80 shadow-sm text-primary hover:text-primary hover:bg-primary/5 shrink-0" asChild>
                          <a
                            href={`tel:${student.profile.emergencyContactPhone}`}
                            title={`Call ${student.profile.emergencyContactName}`}
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-5">No contact details registered</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
