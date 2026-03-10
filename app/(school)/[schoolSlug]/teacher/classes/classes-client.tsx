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
  BadgeDollarSign,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
            className="group relative overflow-hidden border-none bg-card/40 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 ring-1 ring-white/10"
          >
            {/* Gradient Header Decoration */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-1.5",
              cls.isClassTeacher ? "bg-gradient-to-right from-blue-500 to-indigo-500" : "bg-gradient-to-right from-slate-400 to-slate-500"
            )} />

            <CardHeader className="pb-4 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                    {cls.name}
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider italic">
                    {cls.level}
                  </p>
                </div>
                {cls.isClassTeacher && (
                  <Badge
                    className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 shadow-sm whitespace-nowrap"
                  >
                    Class Teacher
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="pb-6 space-y-6">
              {/* Stats & Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-tight">Students</span>
                  </div>
                  <p className="text-lg font-bold">{cls.studentCount}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-tight">Period</span>
                  </div>
                  <p className="text-sm font-medium leading-none mt-1">{cls.academicYear}</p>
                </div>
              </div>

              {/* Subjects Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Your Subjects</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cls.subjects.length > 0 ? (
                    cls.subjects.map((s) => (
                      <Badge
                        key={s.id}
                        variant="secondary"
                        className="bg-secondary/50 hover:bg-secondary text-[10px] font-medium h-5"
                      >
                        {s.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic pl-1">
                      None assigned
                    </span>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-4 bg-black/5 border-t border-white/5 gap-2">
              <div className="grid grid-cols-2 w-full gap-2 font-medium">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 text-xs transition-all hover:bg-primary hover:text-primary-foreground group/btn"
                  asChild
                >
                  <Link
                    href={`/${schoolSlug}/teacher/classes/${cls.slug || cls.id}/students`}
                  >
                    <Users className="h-3.5 w-3.5 mr-2 opacity-70 group-hover/btn:opacity-100" />
                    Students
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 text-xs transition-all hover:bg-blue-600 hover:text-white group/btn"
                  asChild
                >
                  <Link
                    href={`/${schoolSlug}/teacher/classes/${cls.slug || cls.id}/gradebook`}
                  >
                    <GraduationCap className="h-3.5 w-3.5 mr-2 opacity-70 group-hover/btn:opacity-100" />
                    Gradebook
                  </Link>
                </Button>

                {/* Secondary row for Class Teachers */}
                {cls.isClassTeacher ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs bg-white/5 border-white/10 hover:bg-emerald-600 hover:text-white group/btn"
                      asChild
                    >
                      <Link
                        href={`/${schoolSlug}/teacher/classes/${cls.slug || cls.id}/attendance`}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5 mr-2 opacity-70 group-hover/btn:opacity-100" />
                        Attendance
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs bg-white/5 border-white/10 hover:bg-amber-600 hover:text-white group/btn"
                      asChild
                    >
                      <Link
                        href={`/${schoolSlug}/teacher/classes/${cls.slug || cls.id}/fees`}
                      >
                        <BadgeDollarSign className="h-3.5 w-3.5 mr-2 opacity-70 group-hover/btn:opacity-100" />
                        Fees
                      </Link>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs opacity-40 cursor-not-allowed col-span-2 border border-dashed border-white/10"
                    disabled
                    title="Only the Class Teacher can mark attendance"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5 mr-2" />
                    Attendance Restricted
                  </Button>
                )}
              </div>
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
