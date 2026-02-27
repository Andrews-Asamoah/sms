"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  Search,
  ArrowRight,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface TeacherClass {
  id: string;
  name: string;
  slug: string | null;
  level: string;
  studentCount: number;
  isClassTeacher: boolean;
  subjects: {
    id: string;
    name: string;
    code: string;
  }[];
  academicYear: string;
}

interface TeacherClassesClientProps {
  schoolSlug: string;
  classes: TeacherClass[];
}

export function TeacherClassesClient({
  schoolSlug,
  classes,
}: TeacherClassesClientProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClasses = classes.filter(
    (cls) =>
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.level.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Classes</h1>
          <p className="text-muted-foreground">
            Manage your assigned classes, students, and grading.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search classes..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map((cls) => (
          <Card
            key={cls.id}
            className="overflow-hidden hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{cls.name}</CardTitle>
                  <CardDescription>{cls.level}</CardDescription>
                </div>
                {cls.isClassTeacher && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-700 hover:bg-blue-100"
                  >
                    Class Teacher
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-3 border-t pt-4 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{cls.studentCount} Students</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="h-4 w-4" />
                  <span>Your Subjects:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {cls.subjects.length > 0 ? (
                    cls.subjects.map((s) => (
                      <Badge
                        key={s.id}
                        variant="outline"
                        className="text-[10px] font-normal"
                      >
                        {s.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      None assigned
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{cls.academicYear}</span>
              </div>
            </CardContent>
            <CardFooter
              className={`bg-muted/50 p-3 grid gap-2 ${cls.isClassTeacher ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3"}`}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1"
                asChild
              >
                <Link
                  href={`/${schoolSlug}/teacher/classes/${cls.slug || cls.id}/students`}
                >
                  <Users className="h-3 w-3" />
                  Students
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1"
                asChild
              >
                <Link
                  href={`/${schoolSlug}/teacher/classes/${cls.slug || cls.id}/attendance`}
                >
                  <ClipboardCheck className="h-3 w-3" />
                  Attendance
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 font-semibold text-blue-600"
                asChild
              >
                <Link
                  href={`/${schoolSlug}/teacher/classes/${cls.slug || cls.id}/gradebook`}
                >
                  <GraduationCap className="h-3 w-3" />
                  Gradebook
                </Link>
              </Button>
              {cls.isClassTeacher && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1 font-semibold text-emerald-600"
                  asChild
                >
                  <Link
                    href={`/${schoolSlug}/teacher/classes/${cls.slug || cls.id}/fees`}
                  >
                    <ClipboardCheck className="h-3 w-3" />
                    Fees Status
                  </Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredClasses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
          <GraduationCap className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No Classes Found</h3>
          <p className="text-muted-foreground max-w-sm">
            {searchTerm
              ? `No classes matching "${searchTerm}"`
              : "You are not assigned to any classes for this academic year."}
          </p>
          {searchTerm && (
            <Button variant="link" onClick={() => setSearchTerm("")}>
              Clear search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
